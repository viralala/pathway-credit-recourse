import { ASSUMPTIONS, type Assumptions } from "./config";
import {
  MODEL,
  approvesLogit,
  clean,
  contribution,
  isIncomeUnusable,
  isLateSpecialCode,
  isUtilizationInvalid,
  logit,
  scoreFromLogit,
  thresholdLogit,
} from "./model";
import type { Applicant, CreditModel, FeatureClass, FeatureKey, ModelFeatureKey } from "./types";

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

export interface RecourseOptions {
  /**
   * Pathway score the plan must reach instead of the approval cut-off (e.g. the score a cheaper
   * APR tier needs). A target below the cut-off is ignored: a plan always has to reach approval.
   */
  targetScore?: number;
}

/**
 * Log-odds a target Pathway score requires: the inverse of `scoreFromLogit`, never looser than the
 * approval cut-off. With no (or a non-finite) target this is exactly `thresholdLogit(model)`.
 */
export function targetLogit(targetScore: number | undefined, model: CreditModel = MODEL): number {
  const zThreshold = thresholdLogit(model);
  if (targetScore === undefined || !Number.isFinite(targetScore)) return zThreshold;
  const z = zThreshold - ((targetScore - model.thresholdScore) * Math.LN2) / model.pointsToDoubleOdds;
  return Math.min(zThreshold, z);
}

/**
 * True when log-odds `z` is approved by the model's own rule (probability below the cut-off) and,
 * if `zGoal` is a stricter target than approval, also reaches that target.
 */
export function reachesGoal(z: number, zGoal: number, model: CreditModel = MODEL): boolean {
  if (!approvesLogit(z, model)) return false;
  return zGoal < thresholdLogit(model) ? z <= zGoal : true;
}

/** The score a target actually means: never below the approval cut-off. */
export function effectiveTargetScore(targetScore: number | undefined, model: CreditModel = MODEL): number {
  return targetScore === undefined || !Number.isFinite(targetScore)
    ? model.thresholdScore
    : Math.max(model.thresholdScore, targetScore);
}

/** Late payments still inside the window after `months`, assuming the `n` events were evenly spread. */
export function agedCount(n: number, months: number, window: number = ASSUMPTIONS.delinquencyWindowMonths): number {
  if (n <= 0) return 0;
  if (months <= 0) return n;
  const x = (n * (window - months)) / window + 0.5;
  return Math.max(0, Math.min(n, Math.ceil(x - 1e-9) - 1));
}

/**
 * `agedCount` for a real late-payment count. A bureau special code (96/98) is not a count: the
 * model replaces it and sets `lateSpecialCode`, and nothing here can claim it ages out.
 */
export function agedLateCount(n: number, months: number, window: number = ASSUMPTIONS.delinquencyWindowMonths): number {
  return isLateSpecialCode(n) ? n : agedCount(n, months, window);
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
 * The model features each kind of change can move. Cleaning couples features only inside a
 * group (an unusable income also replaces the debt ratio and sets a flag; a special-coded late
 * count sets `lateSpecialCode`), so the log-odds is an exact sum over the groups.
 */
export const RECOURSE_GROUPS = {
  utilization: ["utilization"],
  lines: ["openCreditLines"],
  wait: ["late30", "late60", "late90", "lateSpecialCode"],
  finances: ["monthlyIncome", "debtRatio", "incomeMissing", "incomePlaceholder"],
} satisfies Record<string, ModelFeatureKey[]>;

/**
 * Drops every option another option beats outright: no more risk, less effort, no slower.
 * This is what removes changes the model cannot see (credit lines beyond the cap, utilization
 * still above the cap, ...), so a plan never lists an action that does nothing.
 */
function undominated<T>(opts: Option<T>[]): Option<T>[] {
  return opts.filter((o) => !opts.some((p) => p !== o && p.logit <= o.logit && p.effort < o.effort && p.months <= o.months));
}

/**
 * Lowest-effort feasible change set that flips a rejection into an approval.
 * Slow-moving inputs are capped by ASSUMPTIONS. Every candidate is scored through the model's own
 * cleaning (`clean`), so a change the model cannot see earns nothing, and a plan is only returned
 * once the model itself approves the state it leads to.
 *
 * With `opts.targetScore`, "success" means reaching that score (or approval, whichever is
 * stricter), and `{ status: "approved" }` means the applicant already meets the target today.
 * Without it the search is exactly the approval search.
 */
export function findRecourse(
  applicant: Applicant,
  model: CreditModel = MODEL,
  a: Assumptions = ASSUMPTIONS,
  opts: RecourseOptions = {},
): RecourseResult {
  const zGoal = targetLogit(opts.targetScore, model);
  const z0 = logit(applicant, model);
  if (reachesGoal(z0, zGoal, model)) return { status: "approved" };

  const e = a.effort;
  const window = a.delinquencyWindowMonths;
  /** Exact log-odds a candidate applicant gets from one group of model features. */
  const part = (candidate: Applicant, keys: readonly ModelFeatureKey[]) => {
    const x = clean(candidate);
    let z = 0;
    for (const f of model.features) if (keys.includes(f.key)) z += contribution(f, x[f.key]);
    return z;
  };

  // Part of the log-odds no plan can touch: the intercept and any feature outside the groups.
  const grouped: ModelFeatureKey[] = Object.values(RECOURSE_GROUPS).flat();
  const x0 = clean(applicant);
  let zFixed = model.intercept;
  for (const f of model.features) if (!grouped.includes(f.key)) zFixed += contribution(f, x0[f.key]);

  // A utilization above the invalid limit is a data error the model replaces with the training
  // median. Paying it down is not what would move the score, so it is not offered.
  const u0 = applicant.utilization;
  const utilValues = u0 > 0 && !isUtilizationInvalid(u0) ? [...range(0, u0, a.grid.utilizationStep).map((d) => u0 - d), 0] : [u0];
  const utilOpts: Option<number>[] = undominated(
    utilValues
      .filter((v, i, arr) => v >= -1e-9 && arr.indexOf(v) === i)
      .map((u) => {
        const t = u === u0 ? u0 : Math.max(0, Math.round(u * 1e4) / 1e4);
        return {
          value: t,
          logit: part({ ...applicant, utilization: t }, RECOURSE_GROUPS.utilization),
          effort: ((u0 - t) / 0.1) * e.per10ppUtilization,
          months: monthsToCutUtilization(u0, t, a),
        };
      })
      .filter((o) => o.months <= a.horizonMonths),
  );

  const lineOpts: Option<number>[] = undominated(
    range(-a.maxOpenLineChange, a.maxOpenLineChange, 1)
      .filter((d) => applicant.openCreditLines + d >= 0)
      .map((d) => ({
        value: d,
        logit: part({ ...applicant, openCreditLines: applicant.openCreditLines + d }, RECOURSE_GROUPS.lines),
        effort: Math.abs(d) * e.perOpenLineChange,
        months: d === 0 ? 0 : a.openLineLagMonths,
      })),
  );

  // Only real counts age out; a special code stays as it is (see agedLateCount).
  const aged = (w: number) => ({
    late30: agedLateCount(applicant.late30, w, window),
    late60: agedLateCount(applicant.late60, w, window),
    late90: agedLateCount(applicant.late90, w, window),
  });
  const hasLates = [applicant.late30, applicant.late60, applicant.late90].some((n) => n > 0 && !isLateSpecialCode(n));
  const waitOpts: Option<number>[] = undominated(
    (hasLates ? [...a.waitOptionsMonths] : [0])
      .filter((w) => w <= a.horizonMonths)
      .map((w) => ({
        value: w,
        logit: part({ ...applicant, ...aged(w) }, RECOURSE_GROUPS.wait),
        effort: w * e.perMonthWaiting,
        months: w,
      })),
  );

  // Debt ratio depends jointly on the payment cut and income growth. Without a usable income
  // (not provided, or a 0/1 placeholder) the model replaces both income and debt ratio with
  // training medians, so neither a payment cut nor a raise can move the score: not offered.
  const incomeUsable = !isIncomeUnusable(applicant.monthlyIncome);
  const cuts = incomeUsable ? range(0, a.maxDebtPaymentCut, a.grid.debtPaymentCutStep) : [0];
  const growths = incomeUsable ? range(0, a.maxIncomeGrowth, a.grid.incomeGrowthStep) : [0];
  const finAll: Option<{ cut: number; growth: number }>[] = [];
  for (const cut of cuts)
    for (const growth of growths) {
      const months = Math.max(monthsToCutDebt(cut, a), monthsToGrowIncome(growth, a));
      if (months > a.horizonMonths) continue;
      finAll.push({
        value: { cut, growth },
        logit: part(
          {
            ...applicant,
            debtRatio: debtRatioAfter(applicant.debtRatio, cut, growth),
            monthlyIncome: applicant.monthlyIncome * (1 + growth),
          },
          RECOURSE_GROUPS.finances,
        ),
        effort: (cut / 0.1) * e.per10pctDebtPaymentCut + (growth / 0.05) * e.per5pctIncomeGrowth,
        months,
      });
    }
  const finOpts = undominated(finAll);

  type Best = { u: Option<number>; l: Option<number>; w: Option<number>; f: Option<{ cut: number; growth: number }>; z: number; effort: number; months: number };
  let best: Best | null = null;
  let closest: Best | null = null;

  /** The applicant once every action is complete. */
  const targetOf = (b: Pick<Best, "u" | "l" | "w" | "f">): Applicant => ({
    ...applicant,
    utilization: b.u.value,
    openCreditLines: applicant.openCreditLines + b.l.value,
    monthlyIncome: applicant.monthlyIncome * (1 + b.f.value.growth),
    debtRatio: debtRatioAfter(applicant.debtRatio, b.f.value.cut, b.f.value.growth),
    ...aged(b.w.value),
  });

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
          const cand: Best = { u, l, w, f, z, effort, months };
          const improves = !best || effort < best.effort - 1e-9 || (Math.abs(effort - best.effort) <= 1e-9 && months < best.months);
          if (reachesGoal(z, zGoal, model)) {
            // `z` is the sum over groups. The plan is only accepted once the model itself, run
            // on the finished applicant, agrees.
            if (improves && reachesGoal(logit(targetOf(cand), model), zGoal, model)) best = cand;
          } else if (!closest || z < closest.z) {
            closest = cand;
          }
        }
      }

  const build = (b: Best): RecoursePlan => {
    const { cut, growth } = b.f.value;
    const target = targetOf(b);
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
      flipsDecision: approvesLogit(zAfter, model),
    };
  };

  if (best) return { status: "plan", plan: build(best) };
  // Nothing reaches the goal: report the candidate that gets closest (failing that, no change).
  const zero = <T,>(opts: Option<T>[]) => opts.reduce((m, o) => (o.effort < m.effort ? o : m));
  const none: Best = { u: zero(utilOpts), l: zero(lineOpts), w: zero(waitOpts), f: zero(finOpts), z: z0, effort: 0, months: 0 };
  return { status: "infeasible", closest: build(closest ?? none) };
}
