import { ASSUMPTIONS, type Assumptions } from "./config";
import { MODEL, logit, score as scoreOf } from "./model";
import { PRICING, aprForScore, emi, scoreForApr, tierFor, totalInterest, type RateTier } from "./pricing";
import { findRecourse, reachesGoal, targetLogit, type RecoursePlan, type RecourseResult } from "./recourse";
import { simulate, type Timeline } from "./timeline";
import type { Applicant, CreditModel } from "./types";

/**
 * Goal-first planning: start from the loan a person wants ("₹X over N months at no more than A% a year")
 * and work backwards to the Pathway score that APR needs, the lowest-effort plan to reach it, when they
 * get there and whether the monthly payment fits their budget.
 *
 * Every price here comes from lib/pricing.ts and is ILLUSTRATIVE; the UI says so next to every figure.
 */

export interface Goal {
  /** Principal in rupees. */
  amount: number;
  termMonths: number;
  /** Highest APR the person would accept, as a fraction (0.15 = 15%). */
  maxApr: number;
}

/** Input ranges the planner accepts. Anything outside is clamped by `normalizeGoal`. */
export const GOAL_LIMITS = {
  amount: { min: 10_000, max: 20_00_000, step: 10_000 },
  termMonths: { min: 12, max: 60, step: 6 },
  maxApr: { min: 0.1, max: 0.36, step: 0.005 },
} as const;

export const DEFAULT_GOAL: Goal = {
  amount: PRICING.defaultLoan.amount,
  termMonths: PRICING.defaultLoan.termMonths,
  maxApr: 0.15,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finiteOr = (v: number | undefined, fallback: number) => (v !== undefined && Number.isFinite(v) ? v : fallback);

/** A goal inside GOAL_LIMITS: whole rupees, whole months, APR rounded to 0.01 percentage points. */
export function normalizeGoal(g: Partial<Goal>, fallback: Goal = DEFAULT_GOAL): Goal {
  const L = GOAL_LIMITS;
  return {
    amount: Math.round(clamp(finiteOr(g.amount, fallback.amount), L.amount.min, L.amount.max)),
    termMonths: Math.round(clamp(finiteOr(g.termMonths, fallback.termMonths), L.termMonths.min, L.termMonths.max)),
    maxApr: Math.round(clamp(finiteOr(g.maxApr, fallback.maxApr), L.maxApr.min, L.maxApr.max) * 1e4) / 1e4,
  };
}

/** Largest principal whose EMI is `payment` at this APR and term: the inverse of `emi`. */
export function principalFor(payment: number, apr: number, months: number): number {
  if (!(payment > 0) || !(months > 0)) return 0;
  const r = apr / 12;
  if (r <= 1e-12) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

/** Best (cheapest) tier in the price list. */
export function bestTier(p: typeof PRICING = PRICING): RateTier {
  return p.tiers.reduce((best, t) => (t.apr < best.apr ? t : best), p.tiers[0]);
}

export interface Affordability {
  amount: number;
  apr: number;
  termMonths: number;
  monthlyIncome: number;
  /** Debt payments already being made: debtRatio × monthly income. */
  existingPayments: number;
  /** Most all loan payments together may take: PRICING.maxEmiToIncome × monthly income. */
  budget: number;
  /** Room left for this loan's EMI. Never negative. */
  allowed: number;
  emi: number;
  affordable: boolean;
  /** Largest principal whose EMI fits in `allowed` at this APR and term. */
  maxAmount: number;
  /** Shortest longer term (up to GOAL_LIMITS max) whose EMI fits, when the requested term does not. */
  fitTermMonths: number | null;
  /** EMI over `fitTermMonths`, or null. */
  fitTermEmi: number | null;
  /** EMI at the longest term the planner allows. */
  longestTermEmi: number;
  longestTermMonths: number;
}

/** Can this applicant carry an EMI on `amount` at `apr` over `termMonths`? */
export function affordabilityFor(
  state: Applicant,
  amount: number,
  apr: number,
  termMonths: number,
  p: typeof PRICING = PRICING,
): Affordability {
  const monthlyIncome = Math.max(0, state.monthlyIncome);
  const existingPayments = Math.max(0, state.debtRatio) * monthlyIncome;
  const budget = p.maxEmiToIncome * monthlyIncome;
  const allowed = Math.max(0, budget - existingPayments);
  const payment = emi(amount, apr, termMonths);
  const affordable = amount > 0 && payment <= allowed + 1e-9;
  const longestTermMonths = GOAL_LIMITS.termMonths.max;
  let fitTermMonths: number | null = null;
  if (!affordable && allowed > 0)
    for (let n = termMonths + 1; n <= longestTermMonths; n++)
      if (emi(amount, apr, n) <= allowed + 1e-9) {
        fitTermMonths = n;
        break;
      }
  return {
    amount,
    apr,
    termMonths,
    monthlyIncome,
    existingPayments,
    budget,
    allowed,
    emi: payment,
    affordable,
    maxAmount: principalFor(allowed, apr, termMonths),
    fitTermMonths,
    fitTermEmi: fitTermMonths === null ? null : emi(amount, apr, fitTermMonths),
    longestTermEmi: emi(amount, apr, longestTermMonths),
    longestTermMonths,
  };
}

/** A dated checkpoint on the way to the goal. `kind` decides the sentence; the UI localizes it. */
export type Milestone =
  | { key: string; month: number; kind: "utilization"; from: number; to: number }
  | { key: string; month: number; kind: "debt"; cut: number; payments: number }
  | { key: string; month: number; kind: "income"; from: number; to: number }
  | { key: string; month: number; kind: "lines"; from: number; to: number }
  | { key: string; month: number; kind: "late"; feature: "late30" | "late60" | "late90"; remaining: number }
  | { key: string; month: number; kind: "approval"; tier: RateTier["id"]; score: number; apr: number }
  | { key: string; month: number; kind: "tier"; tier: RateTier["id"]; score: number; apr: number }
  | { key: string; month: number; kind: "goal"; tier: RateTier["id"]; score: number; apr: number; approval: boolean };

export type MilestoneKind = Milestone["kind"];

const KIND_ORDER: Record<MilestoneKind, number> = {
  utilization: 0,
  debt: 1,
  lines: 2,
  income: 3,
  late: 4,
  approval: 5,
  tier: 6,
  goal: 7,
};

/** First month the timeline's plan state reaches `targetScore`, or null. */
function firstMonthAt(timeline: Timeline, targetScore: number, model: CreditModel): number | null {
  const z = targetLogit(targetScore, model);
  const hit = timeline.points.find((pt) => reachesGoal(logit(pt.state, model), z, model));
  return hit ? hit.month : null;
}

/** Chronological checkpoints: plan actions completing, late payments ageing out, score tiers crossed. */
export function buildMilestones(
  applicant: Applicant,
  plan: RecoursePlan | null,
  timeline: Timeline,
  targetScore: number,
  model: CreditModel = MODEL,
  p: typeof PRICING = PRICING,
): Milestone[] {
  const out: Milestone[] = [];
  if (plan) {
    for (const act of plan.actions) {
      if (act.key === "utilization")
        out.push({ key: "utilization", month: act.months, kind: "utilization", from: act.from, to: act.to });
      else if (act.key === "debtRatio")
        out.push({
          key: "debt",
          month: act.months,
          kind: "debt",
          cut: plan.debtPaymentCut,
          payments: applicant.debtRatio * applicant.monthlyIncome * (1 - plan.debtPaymentCut),
        });
      else if (act.key === "monthlyIncome")
        out.push({ key: "income", month: act.months, kind: "income", from: act.from, to: act.to });
      else if (act.key === "openCreditLines")
        out.push({ key: "lines", month: act.months, kind: "lines", from: act.from, to: act.to });
    }
  }

  // Late payments ageing out, read off the simulated states, up to the point the plan is done.
  const until = Math.min(timeline.points.length - 1, Math.max(timeline.targetMonth ?? 0, plan?.months ?? 0));
  for (const feature of ["late90", "late60", "late30"] as const)
    for (let m = 1; m <= until; m++) {
      const before = timeline.points[m - 1].state[feature];
      const now = timeline.points[m].state[feature];
      if (now < before) out.push({ key: `${feature}-${m}`, month: m, kind: "late", feature, remaining: now });
    }

  // Score tiers crossed on the way, up to and including the goal tier. Tiers already held today are skipped.
  const ascending = [...p.tiers].sort((x, y) => x.minScore - y.minScore);
  for (const tier of ascending) {
    if (tier.minScore > targetScore + 1e-9) break;
    const isGoal = tier.minScore >= targetScore - 1e-9;
    const month = isGoal ? timeline.targetMonth : firstMonthAt(timeline, tier.minScore, model);
    if (month === null || month === 0) continue;
    const approval = tier.minScore <= model.thresholdScore;
    const base = { key: `tier-${tier.id}`, month, tier: tier.id, score: tier.minScore, apr: tier.apr };
    if (isGoal) out.push({ ...base, kind: "goal", approval });
    else if (approval) out.push({ ...base, kind: "approval" });
    else out.push({ ...base, kind: "tier" });
  }

  return out
    .map((m, i) => ({ m, i }))
    .sort((x, y) => x.m.month - y.m.month || KIND_ORDER[x.m.kind] - KIND_ORDER[y.m.kind] || x.i - y.i)
    .map((x) => x.m);
}

export interface TodayOffer {
  score: number;
  tier: RateTier | null;
  /** Prime-lender APR today, or null when a prime lender would decline. */
  apr: number | null;
  declined: boolean;
  /** APR actually faced today: the prime tier, or the high-cost alternative when declined. */
  effectiveApr: number;
  /** The goal loan at today's effective APR, with today's income and debts. */
  affordability: Affordability;
  /** Total interest on the goal loan at today's effective APR. */
  interest: number;
}

export type GoalStatus = "met-today" | "plan" | "infeasible";

export interface GoalPlan {
  /** The goal after clamping to GOAL_LIMITS. */
  goal: Goal;
  /** "met-today": no plan needed; "plan": reaches the target; "infeasible": closest plan shown. */
  status: GoalStatus;
  /** Score the requested APR needs, or null when no tier is that cheap. */
  requiredScore: number | null;
  aprReachable: boolean;
  /** Cheapest APR any tier offers. */
  cheapestApr: number;
  /** Score the plan aims for: `requiredScore`, or the best tier's score when no tier is cheap enough. */
  targetScore: number;
  targetTier: RateTier;
  /** APR at the target tier (at or below `goal.maxApr` whenever `aprReachable`). */
  targetApr: number;
  currentScore: number;
  currentTier: RateTier | null;
  currentApr: number | null;
  declinedToday: boolean;
  meetsToday: boolean;
  pointsToGo: number;
  recourse: RecourseResult;
  /** Plan that reaches the target, the closest one if none does, or null when the goal is met today. */
  plan: RecoursePlan | null;
  timeline: Timeline;
  /** First month the plan reaches the target score (0 when met today), or null. */
  targetMonth: number | null;
  approvalMonth: number | null;
  /** Applicant once the plan is complete (today's profile when the goal is already met). */
  targetState: Applicant;
  /** Score of `targetState`. */
  scoreAfter: number;
  /** EMI and total interest on the goal loan at the target APR. */
  emi: number;
  totalInterest: number;
  affordability: {
    /** At the target APR with today's income and debts. */
    today: Affordability;
    /** At the target APR once the plan is complete (income may have grown, debt payments may be lower). */
    afterPlan: Affordability;
  };
  today: TodayOffer;
  /** Interest avoided on the goal loan by borrowing at the target APR instead of today's. Never negative. */
  interestSaved: number;
  milestones: Milestone[];
  horizonMonths: number;
}

export interface GoalOptions {
  model?: CreditModel;
  assumptions?: Assumptions;
  pricing?: typeof PRICING;
}

/** Work backwards from the loan a person wants to the plan that gets them its price. */
export function planGoal(applicant: Applicant, goalInput: Goal, opts: GoalOptions = {}): GoalPlan {
  const model = opts.model ?? MODEL;
  const a = opts.assumptions ?? ASSUMPTIONS;
  const p = opts.pricing ?? PRICING;
  const goal = normalizeGoal(goalInput);

  const best = bestTier(p);
  const requiredScore = scoreForApr(goal.maxApr, p);
  const targetScore = requiredScore ?? best.minScore;
  const targetTier = tierFor(targetScore, p) ?? best;
  const targetApr = targetTier.apr;

  const currentScore = scoreOf(applicant, model);
  const currentTier = tierFor(currentScore, p);
  const currentApr = aprForScore(currentScore, p);

  const recourse = findRecourse(applicant, model, a, { targetScore });
  const plan = recourse.status === "plan" ? recourse.plan : recourse.status === "infeasible" ? recourse.closest : null;
  const timeline = simulate(applicant, plan, model, a, { targetScore });
  const status: GoalStatus = recourse.status === "approved" ? "met-today" : recourse.status;
  const targetState = plan ? plan.target : applicant;

  const todayApr = currentApr ?? p.declinedAlternativeApr;
  const today: TodayOffer = {
    score: currentScore,
    tier: currentTier,
    apr: currentApr,
    declined: currentTier === null,
    effectiveApr: todayApr,
    affordability: affordabilityFor(applicant, goal.amount, todayApr, goal.termMonths, p),
    interest: totalInterest(goal.amount, todayApr, goal.termMonths),
  };
  const goalInterest = totalInterest(goal.amount, targetApr, goal.termMonths);

  return {
    goal,
    status,
    requiredScore,
    aprReachable: requiredScore !== null,
    cheapestApr: best.apr,
    targetScore,
    targetTier,
    targetApr,
    currentScore,
    currentTier,
    currentApr,
    declinedToday: currentTier === null,
    meetsToday: status === "met-today",
    pointsToGo: status === "met-today" ? 0 : Math.max(0, targetScore - currentScore),
    recourse,
    plan,
    timeline,
    targetMonth: timeline.targetMonth,
    approvalMonth: timeline.approvalMonth,
    targetState,
    scoreAfter: scoreOf(targetState, model),
    emi: emi(goal.amount, targetApr, goal.termMonths),
    totalInterest: goalInterest,
    affordability: {
      today: affordabilityFor(applicant, goal.amount, targetApr, goal.termMonths, p),
      afterPlan: affordabilityFor(targetState, goal.amount, targetApr, goal.termMonths, p),
    },
    today,
    interestSaved: Math.max(0, today.interest - goalInterest),
    milestones: buildMilestones(applicant, plan, timeline, targetScore, model, p),
    horizonMonths: a.horizonMonths,
  };
}
