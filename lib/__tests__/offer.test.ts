import { describe, expect, it } from "vitest";
import {
  CHECKLIST,
  OFFER_EXAMPLES,
  OFFER_THRESHOLDS,
  allFlags,
  analyzeOffer,
  cashFlows,
  checklistFlags,
  compareWithPathway,
  costAtApr,
  costBreakdown,
  formFromInput,
  formatMoney,
  formatRate,
  inputFromForm,
  npv,
  parseNumber,
  paymentSchedule,
  solveDailyRate,
  validateOffer,
  verdictFor,
  type OfferAnalysis,
  type OfferInput,
} from "../offer";
import { PRICING } from "../pricing";
import { GUIDANCE_LINKS, GUIDANCE_ORDER, OFFER_STRINGS, daysText, flagCopy, periodText } from "../strings/offer";

const bullet = (sanctioned: number, amount: number, days: number, fee = 0, gstPct = 0): OfferInput => ({
  sanctioned,
  processingFee: fee,
  otherCharges: 0,
  gstPct,
  repayment: { kind: "bullet", amount, days },
});

function ok(input: OfferInput): OfferAnalysis {
  const r = analyzeOffer(input);
  if (!r.ok) throw new Error(`expected a valid offer, got ${JSON.stringify(r.errors)}`);
  return r.analysis;
}

describe("offer engine: known answers", () => {
  it("prices a single bullet repayment exactly", () => {
    // Receive 8,000, repay 10,000 after 30 days.
    const a = ok(bullet(8000, 10000, 30));
    const expected = (Math.pow(10000 / 8000, 1 / 30) - 1) * 365;
    expect(a.apr).toBeCloseTo(expected, 10);
    expect(a.effectiveAnnualRate).toBeCloseTo(Math.pow(10000 / 8000, 365 / 30) - 1, 6);
    expect(a.received).toBe(8000);
    expect(a.totalRepaid).toBe(10000);
    expect(a.costOfCredit).toBe(2000);
    expect(a.costShareOfReceived).toBeCloseTo(0.25, 12);
    expect(a.tenureDays).toBe(30);
  });

  it("treats upfront deductions as money never received", () => {
    // Sanction 10,000 with a 2,000 fee deducted is the same cash flow as receiving 8,000.
    const withFee = ok(bullet(10000, 10000, 30, 2000));
    const plain = ok(bullet(8000, 10000, 30));
    expect(withFee.received).toBe(8000);
    expect(withFee.apr).toBeCloseTo(plain.apr, 10);
    expect(withFee.feeShareOfSanction).toBeCloseTo(0.2, 12);
  });

  it("adds tax on fees to the deductions", () => {
    const a = ok({ ...bullet(10000, 10000, 30, 1000, 18), otherCharges: 500 });
    expect(a.deductions.tax).toBeCloseTo(270, 9);
    expect(a.deductions.total).toBeCloseTo(1770, 9);
    expect(a.received).toBeCloseTo(8230, 9);
  });

  it("reports zero cost for a zero-cost offer", () => {
    const a = ok(bullet(10000, 10000, 30));
    expect(a.apr).toBe(0);
    expect(a.effectiveAnnualRate).toBe(0);
    expect(a.costOfCredit).toBe(0);
    expect(a.verdict).toBe("fair");
    expect(a.flags.map((f) => f.id)).toEqual(["short-tenure"]);
  });

  it("recovers the rate of an amortising loan under the 30-day convention", () => {
    // 12 monthly instalments of a 10,000 loan at 12% APR (1% a month): EMI 888.4879.
    const r = 0.01;
    const emiValue = (10000 * r) / (1 - Math.pow(1 + r, -12));
    const a = ok({
      sanctioned: 10000,
      processingFee: 0,
      otherCharges: 0,
      gstPct: 0,
      repayment: { kind: "instalments", count: 12, amount: emiValue, everyDays: 30 },
    });
    // Documented convention: 1% per 30 days is (1.01^(1/30) - 1) x 365, about 12.1%.
    expect(a.apr).toBeCloseTo((Math.pow(1.01, 1 / 30) - 1) * 365, 8);
    expect(Math.abs(a.apr - 0.12)).toBeLessThan(0.002);
    expect(a.tenureDays).toBe(360);
    expect(a.periodDays).toBe(30);
    expect(a.paymentCount).toBe(12);
  });

  it("builds instalment schedules on the right days", () => {
    expect(paymentSchedule({ kind: "instalments", count: 3, amount: 50, everyDays: 14 })).toEqual([
      { day: 14, amount: 50 },
      { day: 28, amount: 50 },
      { day: 42, amount: 50 },
    ]);
    expect(cashFlows(bullet(1000, 1100, 10, 100))).toEqual([
      { day: 0, amount: 900 },
      { day: 10, amount: -1100 },
    ]);
  });

  it("solves to an NPV of zero", () => {
    const flows = cashFlows({
      sanctioned: 20000,
      processingFee: 1500,
      otherCharges: 500,
      gstPct: 18,
      repayment: { kind: "instalments", count: 12, amount: 2000, everyDays: 7 },
    });
    const r = solveDailyRate(flows)!;
    expect(r).toBeGreaterThan(0);
    expect(Math.abs(npv(flows, r))).toBeLessThan(1e-6);
  });
});

describe("offer engine: behaviour", () => {
  it("raises the APR monotonically as fees grow", () => {
    let prev = -Infinity;
    for (let fee = 0; fee <= 3000; fee += 250) {
      const apr = ok(bullet(10000, 10500, 30, fee)).apr;
      expect(apr).toBeGreaterThan(prev);
      prev = apr;
    }
  });

  it("raises the APR as the same cost is squeezed into fewer days", () => {
    let prev = -Infinity;
    for (const days of [365, 180, 90, 30, 7]) {
      const apr = ok(bullet(10000, 11000, days)).apr;
      expect(apr).toBeGreaterThan(prev);
      prev = apr;
    }
  });

  it("handles repaying less than received without failing", () => {
    const a = ok(bullet(10000, 9000, 30));
    expect(a.apr).toBeLessThan(0);
    expect(a.costOfCredit).toBe(-1000);
    expect(a.verdict).toBe("fair");
    expect(Math.abs(npv(a.flows, a.dailyRate))).toBeLessThan(1e-6);
    expect(costBreakdown(a)).toEqual({ principal: 9000, fees: 0, interest: 0 });
  });

  it("solves very expensive offers without overflow", () => {
    const a = ok(bullet(1000, 100000, 1, 999));
    expect(Number.isFinite(a.apr)).toBe(true);
    expect(a.dailyRate).toBeCloseTo(99999, 3);
    expect(a.verdict).toBe("predatory");
    expect(formatRate(a.effectiveAnnualRate)).toBe("> 1,000,000%");
  });

  it("returns null when the flows have no sign change", () => {
    expect(solveDailyRate([{ day: 0, amount: 100 }])).toBeNull();
    expect(solveDailyRate([{ day: 5, amount: -100 }])).toBeNull();
  });

  it("splits what you pay into principal, fees and interest that add up", () => {
    const a = ok(bullet(5000, 5250, 7, 750, 18));
    const b = costBreakdown(a);
    expect(b.principal).toBeCloseTo(a.received, 9);
    expect(b.fees).toBeCloseTo(a.deductions.total, 9);
    expect(b.interest).toBeCloseTo(250, 9);
    expect(b.principal + b.fees + b.interest).toBeCloseTo(a.totalRepaid, 9);
    // Repaying between received and sanctioned: only part of the fees, no interest.
    const c = costBreakdown(ok(bullet(10000, 9500, 30, 1000)));
    expect(c).toEqual({ principal: 9000, fees: 500, interest: 0 });
  });
});

describe("offer engine: red flags and verdict", () => {
  it("draws the verdict from illustrative APR thresholds", () => {
    expect(verdictFor(0)).toBe("fair");
    expect(verdictFor(OFFER_THRESHOLDS.aprWarning)).toBe("fair");
    expect(verdictFor(OFFER_THRESHOLDS.aprWarning + 0.001)).toBe("expensive");
    expect(verdictFor(OFFER_THRESHOLDS.aprDanger)).toBe("expensive");
    expect(verdictFor(OFFER_THRESHOLDS.aprDanger + 0.001)).toBe("predatory");
  });

  it("flags APR above 36% as a warning and above 100% as danger", () => {
    const at = (apr: number) => ok(bullet(10000, 10000 * Math.pow(1 + apr / 365, 365), 365));
    expect(at(0.36).flags.find((f) => f.id === "apr")).toBeUndefined();
    expect(at(0.5).flags.find((f) => f.id === "apr")).toMatchObject({ severity: "warning", threshold: 0.36 });
    expect(at(1.5).flags.find((f) => f.id === "apr")).toMatchObject({ severity: "danger", threshold: 1 });
    expect(at(0.5).verdict).toBe("expensive");
    expect(at(1.5).verdict).toBe("predatory");
  });

  it("flags upfront deductions above 5% and 10% of the sanction", () => {
    const share = (fee: number) => ok(bullet(10000, 10000, 365, fee)).flags.find((f) => f.id === "deductions");
    expect(share(500)).toBeUndefined();
    expect(share(501)).toMatchObject({ severity: "warning" });
    expect(share(1000)).toMatchObject({ severity: "warning" });
    expect(share(1001)).toMatchObject({ severity: "danger" });
  });

  it("flags tenures under 60 days", () => {
    const tenure = (days: number) => ok(bullet(10000, 10000, days)).flags.find((f) => f.id === "short-tenure");
    expect(tenure(59)).toMatchObject({ severity: "warning", value: 59, threshold: 60 });
    expect(tenure(60)).toBeUndefined();
  });

  it("always surfaces a difference between sanctioned and received", () => {
    expect(ok(bullet(10000, 10000, 365, 1)).flags.find((f) => f.id === "received-differs")).toMatchObject({ severity: "info", value: 1 });
    expect(ok(bullet(10000, 10000, 365)).flags.find((f) => f.id === "received-differs")).toBeUndefined();
  });

  it("notes instalments more frequent than monthly", () => {
    const freq = (everyDays: 7 | 14 | 30) =>
      ok({ sanctioned: 1000, processingFee: 0, otherCharges: 0, gstPct: 0, repayment: { kind: "instalments", count: 12, amount: 90, everyDays } }).flags.find(
        (f) => f.id === "frequent-instalments",
      );
    expect(freq(7)).toMatchObject({ severity: "info", value: 7 });
    expect(freq(14)).toMatchObject({ severity: "info", value: 14 });
    expect(freq(30)).toBeUndefined();
  });

  it("orders flags by severity and adds the self-check", () => {
    const a = ok(bullet(5000, 5250, 7, 750, 18));
    expect(a.flags.map((f) => f.severity)).toEqual(["danger", "danger", "warning", "info"]);
    expect(checklistFlags({})).toEqual([]);
    const all = checklistFlags(Object.fromEntries(CHECKLIST.map((id) => [id, true])));
    expect(all).toHaveLength(CHECKLIST.length);
    expect(all.map((f) => f.id)).toEqual(["permissions", "thirdParty", "pressure", "noKfs", "unverified"]);
    const merged = allFlags(a, { noKfs: true, permissions: true });
    expect(merged[0].severity).toBe("danger");
    expect(merged.filter((f) => f.source === "checklist").map((f) => f.id)).toEqual(["permissions", "noKfs"]);
    expect(merged.map((f) => f.severity)).toEqual(["danger", "danger", "danger", "warning", "warning", "info"]);
  });
});

describe("offer engine: validation", () => {
  it("rejects missing, negative and out-of-range values", () => {
    expect(validateOffer(bullet(NaN, 100, 10))).toMatchObject({ sanctioned: "required" });
    expect(validateOffer(bullet(-5, 100, 10))).toMatchObject({ sanctioned: "positive" });
    expect(validateOffer(bullet(1000, 100, 10, -1))).toMatchObject({ processingFee: "nonNegative" });
    expect(validateOffer(bullet(1000, 0, 10))).toMatchObject({ bulletAmount: "positive" });
    expect(validateOffer(bullet(1000, 1100, 10.5))).toMatchObject({ bulletDays: "integer" });
    expect(validateOffer(bullet(1000, 1100, 0))).toMatchObject({ bulletDays: "positive" });
    expect(validateOffer(bullet(1000, 1100, 99999))).toMatchObject({ bulletDays: "tooLarge" });
    expect(validateOffer(bullet(1000, 1100, 10, 0, 150))).toMatchObject({ gstPct: "percent" });
    expect(validateOffer(bullet(1e12, 1100, 10))).toMatchObject({ sanctioned: "tooLarge" });
    expect(
      validateOffer({ sanctioned: 1000, processingFee: 0, otherCharges: 0, gstPct: 0, repayment: { kind: "instalments", count: 0, amount: NaN, everyDays: 7 } }),
    ).toEqual({ count: "positive", instalment: "required" });
  });

  it("rejects deductions that swallow the whole sanction", () => {
    expect(validateOffer(bullet(1000, 1100, 10, 1000))).toEqual({ processingFee: "feesTooHigh" });
    expect(validateOffer(bullet(1000, 1100, 10, 900, 18))).toEqual({ processingFee: "feesTooHigh" });
    const r = analyzeOffer(bullet(1000, 1100, 10, 1000));
    expect(r.ok).toBe(false);
  });

  it("accepts a valid offer", () => {
    expect(validateOffer(bullet(1000, 1100, 10, 50, 18))).toEqual({});
  });
});

describe("offer engine: comparison with Pathway tiers", () => {
  const fair = PRICING.tiers.find((t) => t.id === "fair")!;
  const excellent = PRICING.tiers.find((t) => t.id === "excellent")!;

  it("costs nothing extra when the offer is priced exactly at the fair tier", () => {
    const repay = 10000 * Math.pow(1 + fair.apr / 365, 90);
    const a = ok(bullet(10000, repay, 90));
    const c = compareWithPathway(a);
    expect(c.fair.tier.id).toBe("fair");
    expect(c.fair.extra).toBeCloseTo(0, 6);
    expect(c.excellent.tier.id).toBe("excellent");
    expect(c.excellent.cost).toBeLessThan(c.fair.cost);
    expect(c.excellent.extra).toBeGreaterThan(0);
  });

  it("keeps the same amount received and the same dates", () => {
    const a = ok(bullet(5000, 5250, 7, 750, 18));
    const atFair = costAtApr(a, fair.apr);
    expect(atFair.totalRepaid).toBeCloseTo(a.received * Math.pow(1 + fair.apr / 365, 7), 9);
    expect(compareWithPathway(a).fair.extra).toBeCloseTo(a.costOfCredit - atFair.cost, 9);
    expect(costAtApr(a, excellent.apr).cost).toBeLessThan(atFair.cost);
  });

  it("reports a negative extra when the offer is cheaper than the tier", () => {
    const a = ok(bullet(10000, 10000, 30));
    expect(compareWithPathway(a).fair.extra).toBeLessThan(0);
  });
});

describe("offer engine: examples, parsing and formatting", () => {
  it("ships fictional examples with the intended verdicts in both currencies", () => {
    const verdicts = Object.fromEntries(
      OFFER_EXAMPLES.flatMap((e) => (["INR", "USD"] as const).map((c) => [`${e.id}-${c}`, ok(e.byCurrency[c]).verdict])),
    );
    expect(verdicts).toEqual({
      "app7-INR": "predatory",
      "app7-USD": "predatory",
      "weekly-INR": "predatory",
      "weekly-USD": "predatory",
      "bank-INR": "fair",
      "bank-USD": "fair",
    });
  });

  it("parses numbers the way people type them", () => {
    expect(parseNumber("1,00,000")).toBe(100000);
    expect(parseNumber(" ₹ 5,000 ")).toBe(5000);
    expect(parseNumber("$1,200.50")).toBe(1200.5);
    expect(parseNumber("१२३")).toBe(123);
    expect(parseNumber(".5")).toBe(0.5);
    expect(parseNumber("-3")).toBe(-3);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
    expect(parseNumber("1.2.3")).toBeNaN();
  });

  it("round-trips between the form and the engine input", () => {
    for (const e of OFFER_EXAMPLES) {
      const input = e.byCurrency.INR;
      expect(inputFromForm(formFromInput(input, "INR"))).toEqual(input);
    }
    const blankFees = inputFromForm({ ...formFromInput(bullet(1000, 1100, 10), "USD"), processingFee: "", otherCharges: " ", gstPct: "" });
    expect(blankFees).toMatchObject({ processingFee: 0, otherCharges: 0, gstPct: 0 });
    expect(inputFromForm({ ...formFromInput(bullet(1000, 1100, 10), "USD"), sanctioned: "" }).sanctioned).toBeNaN();
  });

  it("formats money and rates for each currency", () => {
    expect(formatMoney(100000, "INR")).toBe("₹1,00,000");
    expect(formatMoney(100000, "USD")).toBe("$100,000");
    expect(formatMoney(-1234.4, "USD")).toBe("−$1,234");
    expect(formatRate(0.123)).toBe("12.3%");
    expect(formatRate(0.18)).toBe("18%");
    expect(formatRate(12.93)).toBe("1,293%");
    expect(formatRate(-0.052)).toBe("−5.2%");
    expect(formatRate(-0.0001)).toBe("0%");
    expect(formatRate(Infinity, "INR")).toBe("> 10,00,000%");
  });
});

describe("offer strings", () => {
  /** Every leaf string, keyed by its path. */
  function leaves(o: unknown, prefix = ""): Record<string, string> {
    if (typeof o === "string") return { [prefix]: o };
    return Object.entries(o as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [k, v]) => ({ ...acc, ...leaves(v, prefix ? `${prefix}.${k}` : k) }),
      {},
    );
  }
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("has the same keys and placeholders in English, Hindi and Marathi, none empty", () => {
    const en = leaves(OFFER_STRINGS.en);
    for (const lang of ["hi", "mr"] as const) {
      const other = leaves(OFFER_STRINGS[lang]);
      expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
      for (const [path, text] of Object.entries(other)) {
        expect(text.trim(), `${lang}.${path}`).not.toBe("");
        expect(placeholders(text), `${lang}.${path}`).toEqual(placeholders(en[path]));
      }
    }
  });

  it("keeps helpline numbers and official domains untranslated", () => {
    for (const lang of ["en", "hi", "mr"] as const) {
      const s = OFFER_STRINGS[lang];
      expect(s.do.cyber.body).toContain("1930");
      expect(s.do.cyber.body).toContain("cybercrime.gov.in");
      expect(s.do.ombudsman.body).toContain("cms.rbi.org.in");
      expect(s.notLegal).toContain("rbi.org.in");
    }
    for (const id of GUIDANCE_ORDER) for (const l of GUIDANCE_LINKS[id] ?? []) expect(l.href).toMatch(/^(https:\/\/|tel:)/);
  });

  it("renders flag copy with formatted numbers", () => {
    const s = OFFER_STRINGS.en;
    const a = ok(bullet(5000, 5250, 7, 750, 18));
    const copies = a.flags.map((f) => flagCopy(s, f, "INR"));
    expect(copies[0].title).toBe("True APR above 100%");
    expect(copies[0].body).toContain(formatRate(a.apr, "INR"));
    expect(copies.find((c) => c.title.startsWith("You receive less"))!.body).toContain("₹885");
    expect(copies.every((c) => !/\{\w+\}/.test(c.title + c.body))).toBe(true);
    expect(daysText(s, 1)).toBe("1 day");
    expect(daysText(s, 7)).toBe("7 days");
    expect(periodText(OFFER_STRINGS.mr, 7)).toBe("7 दिवसांत");
  });
});
