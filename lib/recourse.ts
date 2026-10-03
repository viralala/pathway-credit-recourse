import { ASSUMPTIONS, FEATURE_CLASS, type Assumptions } from "./config";
import { MODEL, contribution, logit, scoreFromLogit, thresholdLogit } from "./model";
import type { Applicant, CreditModel, FeatureClass, FeatureKey, ModelFeature } from "./types";

export interface PlanAction {
  key: FeatureKey | "wait";
  kind: FeatureClass | "time";
  from: number;
  to: number;
  effort: number;
  months: number;
}

export interface RecoursePlan {
  /** Recommended change set. */
  utilizationTarget: number;
  debtPaymentCut: number;
  incomeGrowth: number;
  openLineChange: number;
  waitMonths: number;
  /** Applicant once every action is complete (late payments aged by `waitMonths`). */
  target: Applicant;
  actions: PlanAction[];
  effort: number;
  /** Months until every action is complete. */
  months: number;
  scoreBefore: number;
  scoreAfter: number;
  flipsDecision: boolean;
}

export type RecourseResult =
  | { status: "approved" }
  | { status: "plan"; plan: RecoursePlan }
  | { status: "infeasible"; closest: RecoursePlan };

/** Late payments still inside the window after `months`, assuming the `n` events were evenly spread. */
export function agedCount(n: number, months: number, window: number = ASSUMPTIONS.delinquencyWindowMonths): number {
  if (n <= 0) return 0;
  if (months <= 0) return n;
  const x = (n * (window - months)) / window + 0.5;
  return Math.max(0, Math.min(n, Math.ceil(x - 1e-9) - 1));
}

export function monthsToGrowIncome(growth: number, a: Assumptions = ASSUMPTIONS): number {
  if (growth <= 1e-9) return 0;
  return Math.ceil(Math.log(1 + growth) / Math.log(1 + a.incomeGrowthPerMonth) - 1e-9);
}

export function monthsToCutUtilization(from: number, to: number, a: Assumptions = ASSUMPTIONS): number {
  const d = from - to;
  return d <= 1e-9 ? 0 : Math.ceil(d / a.utilizationPaydownPerMonth - 1e-9);
}

export function monthsToCutDebt(cut: number, a: Assumptions = ASSUMPTIONS): number {
  return cut <= 1e-9 ? 0 : Math.ceil(cut / a.debtPaymentCutPerMonth - 1e-9);
}

/** Debt ratio = monthly debt payments / monthly income, so both a payment cut and a raise lower it. */
export function debtRatioAfter(debtRatio: number, cut: number, growth: number): number {
  return (debtRatio * (1 - cut)) / (1 + growth);
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

interface Option<T> {
  value: T;
  logit: number;
  effort: number;
  months: number;
}

/**
 * Lowest-effort feasible change set that flips a rejection into an approval.
 * Immutable features are never touched; slow-moving ones are capped by ASSUMPTIONS.
 * Because the model is logistic regression, every candidate is scored exactly.
 */
export function findRecourse(
  applicant: Applicant,
  model: CreditModel = MODEL,
  a: Assumptions = ASSUMPTIONS,
): RecourseResult {
  const zThreshold = thresholdLogit(model);
  const z0 = logit(applicant, model);
  if (z0 <= zThreshold) return { status: "approved" };

  const feat = Object.fromEntries(model.features.map((f) => [f.key, f])) as Record<FeatureKey, ModelFeature>;
  const c = (key: FeatureKey, v: number) => contribution(feat[key], v);
  const e = a.effort;

  // Part of the log-odds no plan can touch (immutable features).
  let zFixed = model.intercept;
  for (const f of model.features) if (FEATURE_CLASS[f.key] === "immutable") zFixed += c(f.key, applicant[f.key]);

  const u0 = applicant.utilization;
  const utilOpts: Option<number>[] = (u0 > 0 ? [...range(0, u0, a.grid.utilizationStep).map((d) => u0 - d), 0] : [u0])
    .filter((v, i, arr) => v >= -1e-9 && arr.indexOf(v) === i)
    .map((u) => {
      const t = Math.max(0, Math.round(u * 1e4) / 1e4);
      return {
        value: t,
        logit: c("utilization", t),
        effort: ((u0 - t) / 0.1) * e.per10ppUtilization,
        months: monthsToCutUtilization(u0, t, a),
      };
    })
    .filter((o) => o.months <= a.horizonMonths);

  const lineOpts: Option<number>[] = range(-a.maxOpenLineChange, a.maxOpenLineChange, 1)
    .filter((d) => applicant.openCreditLines + d >= 0)
    .map((d) => ({
      value: d,
      logit: c("openCreditLines", applicant.openCreditLines + d),
      effort: Math.abs(d) * e.perOpenLineChange,
      months: d === 0 ? 0 : a.openLineLagMonths,
    }));

  const hasLates = applicant.late30 + applicant.late60 + applicant.late90 > 0;
  const waitOpts: Option<number>[] = (hasLates ? [...a.waitOptionsMonths] : [0])
    .filter((w) => w <= a.horizonMonths)
    .map((w) => ({
      value: w,
      logit:
        c("late30", agedCount(applicant.late30, w, a.delinquencyWindowMonths)) +
        c("late60", agedCount(applicant.late60, w, a.delinquencyWindowMonths)) +
        c("late90", agedCount(applicant.late90, w, a.delinquencyWindowMonths)),
      effort: w * e.perMonthWaiting,
      months: w,
    }));

  // Debt ratio depends jointly on the payment cut and income growth.
  const cuts = range(0, a.maxDebtPaymentCut, a.grid.debtPaymentCutStep);
  const growths = range(0, a.maxIncomeGrowth, a.grid.incomeGrowthStep);
  const finOpts: Option<{ cut: number; growth: number }>[] = [];
  for (const cut of cuts)
    for (const growth of growths) {
      const months = Math.max(monthsToCutDebt(cut, a), monthsToGrowIncome(growth, a));
      if (months > a.horizonMonths) continue;
      finOpts.push({
        value: { cut, growth },
        logit:
          c("debtRatio", debtRatioAfter(applicant.debtRatio, cut, growth)) +
          c("monthlyIncome", applicant.monthlyIncome * (1 + growth)),
        effort: (cut / 0.1) * e.per10pctDebtPaymentCut + (growth / 0.05) * e.per5pctIncomeGrowth,
        months,
      });
    }

  type Best = { u: Option<number>; l: Option<number>; w: Option<number>; f: Option<{ cut: number; growth: number }>; z: number; effort: number; months: number };
  let best: Best | null = null;
  let closest: Best | null = null;

  for (const w of waitOpts)
    for (const l of lineOpts)
      for (const f of finOpts) {
        const zPart = zFixed + w.logit + l.logit + f.logit;
        const effPart = w.effort + l.effort + f.effort;
        if (best && effPart >= best.effort) continue;
        for (const u of utilOpts) {
          const z = zPart + u.logit;
          const effort = effPart + u.effort;
          const months = Math.max(w.months, l.months, f.months, u.months);
          if (z <= zThreshold) {
            if (!best || effort < best.effort - 1e-9 || (Math.abs(effort - best.effort) <= 1e-9 && months < best.months))
              best = { u, l, w, f, z, effort, months };
          } else if (!closest || z < closest.z) {
            closest = { u, l, w, f, z, effort, months };
          }
        }
      }

  const build = (b: Best): RecoursePlan => {
    const { cut, growth } = b.f.value;
    const target: Applicant = {
      ...applicant,
      utilization: b.u.value,
      openCreditLines: applicant.openCreditLines + b.l.value,
      monthlyIncome: applicant.monthlyIncome * (1 + growth),
      debtRatio: debtRatioAfter(applicant.debtRatio, cut, growth),
      late30: agedCount(applicant.late30, b.w.value, a.delinquencyWindowMonths),
      late60: agedCount(applicant.late60, b.w.value, a.delinquencyWindowMonths),
      late90: agedCount(applicant.late90, b.w.value, a.delinquencyWindowMonths),
    };
    const actions: PlanAction[] = [];
    if (b.u.value < u0 - 1e-9)
      actions.push({ key: "utilization", kind: "actionable", from: u0, to: b.u.value, effort: b.u.effort, months: b.u.months });
    if (cut > 0)
      actions.push({
        key: "debtRatio",
        kind: "actionable",
        from: applicant.debtRatio,
        to: target.debtRatio,
        effort: (cut / 0.1) * e.per10pctDebtPaymentCut,
        months: monthsToCutDebt(cut, a),
      });
    if (b.l.value !== 0)
      actions.push({ key: "openCreditLines", kind: "actionable", from: applicant.openCreditLines, to: target.openCreditLines, effort: b.l.effort, months: b.l.months });
    if (growth > 0)
      actions.push({
        key: "monthlyIncome",
        kind: "slow-moving",
        from: applicant.monthlyIncome,
        to: target.monthlyIncome,
        effort: (growth / 0.05) * e.per5pctIncomeGrowth,
        months: monthsToGrowIncome(growth, a),
      });
    if (b.w.value > 0)
      actions.push({ key: "wait", kind: "time", from: 0, to: b.w.value, effort: b.w.effort, months: b.w.value });
    actions.sort((x, y) => y.effort - x.effort);
    const zAfter = logit(target, model);
    return {
      utilizationTarget: b.u.value,
      debtPaymentCut: cut,
      incomeGrowth: growth,
      openLineChange: b.l.value,
      waitMonths: b.w.value,
      target,
      actions,
      effort: b.effort,
      months: b.months,
      scoreBefore: scoreFromLogit(z0, model),
      scoreAfter: scoreFromLogit(zAfter, model),
      flipsDecision: zAfter <= zThreshold,
    };
  };

  if (best) return { status: "plan", plan: build(best) };
  return { status: "infeasible", closest: build(closest!) };
}
