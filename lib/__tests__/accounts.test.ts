import { describe, expect, it } from "vitest";
import { inr, inrShort, INR_PER_MODEL_UNIT } from "../money";
import { score } from "../model";
import { SAMPLES } from "../samples";
import { isUuid, parseCheckin, parseEnquiry, parseSavePlan } from "../security/accountInput";
import { allowedOrigins, trustedOrigin } from "../security/origin";
import { safeNextPath } from "../security/redirect";

const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });
const applicant = SAMPLES[1].applicant;

describe("rupees", () => {
  it("formats with Indian digit grouping", () => {
    expect(inr(250000)).toBe("₹2,50,000");
    expect(inr(1234.6)).toBe("₹1,235");
    expect(inr(-500)).toBe("-₹500");
  });

  it("writes short amounts in lakh and crore, per language", () => {
    expect(inrShort(50_000)).toBe("₹50,000");
    expect(inrShort(2_50_000)).toBe("₹2.5 lakh");
    expect(inrShort(20_00_000)).toBe("₹20 lakh");
    expect(inrShort(1_00_00_000)).toBe("₹1 crore");
    expect(inrShort(25_00_000, "hi")).toBe("₹25 लाख");
    expect(inrShort(1_50_00_000, "mr")).toBe("₹1.5 कोटी");
  });

  it("feeds the model rupees divided by the fixed conversion factor", () => {
    const a = { ...applicant, monthlyIncome: 60_000 };
    const b = { ...applicant, monthlyIncome: 60_000 * 2 };
    expect(INR_PER_MODEL_UNIT).toBe(20);
    expect(score(b)).toBeGreaterThan(score(a));
  });
});

describe("sign-in redirects", () => {
  it("accepts same-site paths only", () => {
    expect(safeNextPath("/check?sample=borderline&lang=hi")).toBe("/check?sample=borderline&lang=hi");
    expect(safeNextPath("/account")).toBe("/account");
    for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example", "evil", "", null, 42, "/auth/callback", "/signin"]) {
      expect(safeNextPath(bad), String(bad)).toBeNull();
    }
  });

  it("builds OAuth return addresses only from allow-listed hosts", () => {
    const env = { NODE_ENV: "production", VERCEL_URL: "pathway-abc.vercel.app" };
    expect(trustedOrigin(headers({ host: "pathway-abc.vercel.app" }), env)).toBe("https://pathway-abc.vercel.app");
    expect(trustedOrigin(headers({ host: "evil.example" }), env)).toBe("https://pathway-credit-recourse.vercel.app");
    expect(trustedOrigin(headers({ "x-forwarded-host": "evil.example", host: "pathway-abc.vercel.app" }), env)).toBe(
      "https://pathway-credit-recourse.vercel.app",
    );
    expect(trustedOrigin(headers({ host: "localhost:3000" }), env)).toBe("https://pathway-credit-recourse.vercel.app");
    expect(allowedOrigins({ NODE_ENV: "development" }).has("http://localhost:3000")).toBe(true);
    expect(trustedOrigin(headers({ host: "pathway.example.in" }), { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://pathway.example.in" })).toBe(
      "https://pathway.example.in",
    );
  });
});

describe("account input", () => {
  it("validates saved plans and check-ins", () => {
    expect(parseSavePlan({ name: "Rohan", applicant, lang: "hi" })).toEqual({ ok: true, value: { name: "Rohan", applicant, lang: "hi" } });
    expect(parseSavePlan({ applicant })).toMatchObject({ ok: true, value: { name: "My plan", lang: "en" } });
    expect(parseSavePlan({ name: "<script>", applicant })).toMatchObject({ ok: true, value: { name: "script" } });
    expect(parseSavePlan({ applicant: { ...applicant, monthlyIncome: 99_00_000 } }).ok).toBe(false);
    expect(parseSavePlan({ applicant, lang: "fr" }).ok).toBe(false);
    expect(parseSavePlan([]).ok).toBe(false);
    expect(parseCheckin({ applicant }).ok).toBe(true);
    expect(parseCheckin({ applicant: { ...applicant, late30: 99 } }).ok).toBe(false);
  });

  it("recognises database ids", () => {
    expect(isUuid("3f2b8a52-6c1e-4d7a-9b3e-2f1a0c9d8e7f")).toBe(true);
    expect(isUuid("../../etc")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("validates partner enquiries and reports every field error", () => {
    const ok = parseEnquiry({ name: "  Priya  Sharma ", organisation: "Example NBFC", email: "Priya@Example.in", kind: "lender", message: "Line one\r\nLine two" });
    expect(ok).toEqual({
      ok: true,
      value: { name: "Priya Sharma", organisation: "Example NBFC", email: "priya@example.in", kind: "lender", message: "Line one\nLine two" },
    });
    const bad = parseEnquiry({ name: "", organisation: "x".repeat(121), email: "not-an-email", kind: "bank", message: "y".repeat(2001) });
    expect(bad).toEqual({ ok: false, errors: { name: "name", organisation: "organisation", email: "email", kind: "kind", message: "message" } });
  });
});
