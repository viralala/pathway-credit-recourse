import { ASSUMPTIONS, UNCERTAINTY, type Assumptions, type Uncertainty } from "./config";
import { MODEL, approvesLogit, logit, scoreFromLogit } from "./model";
import { agedLateCount, debtRatioAfter, type RecoursePlan } from "./recourse";
import type { Applicant, CreditModel, FeatureKey } from "./types";

/**
 * Monte Carlo "how sure is this timeline?" band.
 *
 * The deterministic timeline (lib/timeline.ts) assumes every action moves at exactly its capped
 * pace. Real life wobbles, so each simulated future draws its own pace and income growth and can be
 * hit by income shocks or a fresh late payment. Everything is seeded, so the same applicant always
 * gets the same band, on the server and in the browser.
 */
export interface UncertaintyBand {
  runs: number;
  /** Share of simulated futures (0..1) that reach approval within ASSUMPTIONS.horizonMonths. */
  approvalWithinHorizon: number;
  /** Approval month at the low/mid/high percentiles of UNCERTAINTY.percentiles; null = beyond the horizon at that percentile. */
  months: { low: number | null; mid: number | null; high: number | null };
  /** Per month 0..horizon: score percentiles across runs. */
  band: { month: number; low: number; mid: number; high: number }[];
}

/** Small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit FNV-1a hash of the applicant's values (rounded like the URL, so a shared link reproduces the band). */
export function applicantSeed(applicant: Applicant): number {
  const keys = (Object.keys(applicant) as FeatureKey[]).sort();
  let h = 0x811c9dc5;
  for (const k of keys) {
    const v = applicant[k];
    const text = `${k}=${Number.isFinite(v) ? Number(v.toFixed(4)) : 0};`;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Box-Muller normal draw from the seeded uniform source. */
function normal(rand: () => number, mean: number, sd: number): number {
  if (sd <= 0) {
    // Keep the random stream aligned with the sd > 0 case so toggling sd doesn't reshuffle other draws.
    rand();
    rand();
    return mean;
  }
  const u1 = 1 - rand(); // (0, 1]: safe for log
  const u2 = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Value at percentile p (0..1) of an ascending array, by linear interpolation. */
function interpolated(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const pos = clamp(p, 0, 1) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(n - 1, lo + 1);
  const w = pos - lo;
  return w === 0 ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * w;
}

/** Value at percentile p of an ascending array, by nearest rank (always an observed value). */
function nearest(sorted: Float64Array, p: number): number {
  return sorted[Math.round(clamp(p, 0, 1) * (sorted.length - 1))];
}

/**
 * Replays the plan `uncertainty.runs` times with real-life variation and reports how the approval
 * month and the score spread out.
 *
 * Per run: a pace multiplier on card paydown and debt-payment cuts, and a monthly income growth rate
 * (still capped by the plan's income target). Per month: a chance of an income shock that pauses all
 * progress for a few months, and a chance of a fresh 30-59-day late payment that counts for
 * `delinquencyWindowMonths`. Original late payments age out on the calendar, as in lib/timeline.ts.
 * No feature ever moves past the plan's target. A null plan is simulated with no actions.
 */
export function simulateUncertainty(
  applicant: Applicant,
  plan: RecoursePlan | null,
  opts: { model?: CreditModel; assumptions?: Assumptions; uncertainty?: Uncertainty; seed?: number } = {},
): UncertaintyBand {
  const model = opts.model ?? MODEL;
  const a = opts.assumptions ?? ASSUMPTIONS;
  const u = opts.uncertainty ?? UNCERTAINTY;
  const rand = mulberry32(opts.seed ?? applicantSeed(applicant));

  const H = Math.max(0, Math.floor(a.horizonMonths));
  const W = Math.max(1, Math.floor(a.delinquencyWindowMonths));
  const runs = Math.max(1, Math.floor(u.runs));
  const months = H + 1;

  // Calendar ageing of the late payments already on file: identical in every run.
  const aged30 = new Float64Array(months);
  const aged60 = new Float64Array(months);
  const aged90 = new Float64Array(months);
  for (let m = 0; m < months; m++) {
    aged30[m] = agedLateCount(applicant.late30, m, W);
    aged60[m] = agedLateCount(applicant.late60, m, W);
    aged90[m] = agedLateCount(applicant.late90, m, W);
  }

  const u0 = applicant.utilization;
  const income0 = applicant.monthlyIncome;
  const debt0 = applicant.debtRatio;
  const lines0 = applicant.openCreditLines;
  const [shockLo, shockHi] = u.shockMonths[0] <= u.shockMonths[1] ? u.shockMonths : [u.shockMonths[1], u.shockMonths[0]];

  const scores = new Float64Array(runs * months);
  const approvalMonths = new Float64Array(runs);
  /** expiring[m] = fresh late payments that drop out of the window at month m. */
  const expiring = new Int32Array(months + W + 1);
  /** One mutable state object, reused for every month of every run. */
  const s: Applicant = { ...applicant };

  for (let r = 0; r < runs; r++) {
    const pace = clamp(normal(rand, u.paceMultiplier.mean, u.paceMultiplier.sd), u.paceMultiplier.min, u.paceMultiplier.max);
    const growthRate = clamp(
      normal(rand, u.incomeGrowthPerMonth.mean, u.incomeGrowthPerMonth.sd),
      u.incomeGrowthPerMonth.min,
      u.incomeGrowthPerMonth.max,
    );
    const utilRate = a.utilizationPaydownPerMonth * pace;
    const cutRate = a.debtPaymentCutPerMonth * pace;

    expiring.fill(0);
    let progress = 0; // months of actual progress (shocks pause it)
    let paused = 0;
    let freshLates = 0;
    let approvedAt = Number.POSITIVE_INFINITY;
    const row = r * months;

    for (let m = 0; m < months; m++) {
      if (m > 0) {
        if (paused > 0) paused--;
        else if (rand() < u.shockChancePerMonth) paused = shockLo + Math.floor(rand() * (shockHi - shockLo + 1)) - 1;
        else progress++;

        freshLates -= expiring[m];
        if (rand() < u.newLateChancePerMonth) {
          freshLates++;
          expiring[m + W]++;
        }
      }

      s.late30 = aged30[m] + freshLates;
      s.late60 = aged60[m];
      s.late90 = aged90[m];
      if (plan) {
        // Same arithmetic as stateAt() in lib/timeline.ts, with `progress` in place of the calendar month.
        const util = Math.max(plan.utilizationTarget, u0 - utilRate * progress);
        const cut = Math.min(plan.debtPaymentCut, cutRate * progress);
        const growth = Math.min(plan.incomeGrowth, Math.pow(1 + growthRate, progress) - 1);
        s.utilization = Math.abs(util - plan.utilizationTarget) < 1e-9 ? plan.utilizationTarget : util;
        s.monthlyIncome = income0 * (1 + growth);
        s.debtRatio = debtRatioAfter(debt0, cut, growth);
        s.openCreditLines = progress >= a.openLineLagMonths ? lines0 + plan.openLineChange : lines0;
      }

      // Equivalent to isApproved(s, model), sharing one logit with the score.
      const z = logit(s, model);
      scores[row + m] = scoreFromLogit(z, model);
      if (approvedAt === Number.POSITIVE_INFINITY && approvesLogit(z, model)) approvedAt = m;
    }
    approvalMonths[r] = approvedAt;
  }

  let reached = 0;
  for (let r = 0; r < runs; r++) if (Number.isFinite(approvalMonths[r])) reached++;
  approvalMonths.sort();
  const monthAt = (p: number) => {
    const v = nearest(approvalMonths, p);
    return Number.isFinite(v) ? v : null;
  };

  const { low: pLow, mid: pMid, high: pHigh } = u.percentiles;
  const column = new Float64Array(runs);
  const band: UncertaintyBand["band"] = [];
  for (let m = 0; m < months; m++) {
    for (let r = 0; r < runs; r++) column[r] = scores[r * months + m];
    column.sort();
    band.push({ month: m, low: interpolated(column, pLow), mid: interpolated(column, pMid), high: interpolated(column, pHigh) });
  }

  return {
    runs,
    approvalWithinHorizon: reached / runs,
    months: { low: monthAt(pLow), mid: monthAt(pMid), high: monthAt(pHigh) },
    band,
  };
}
