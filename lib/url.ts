import { DEFAULT_SAMPLE, getSample } from "./samples";
import type { Applicant, FeatureKey } from "./types";

/** Short query-string names for each applicant field. */
export const PARAM: Record<FeatureKey, string> = {
  monthlyIncome: "income",
  utilization: "util",
  debtRatio: "dti",
  age: "age",
  openCreditLines: "lines",
  late30: "l30",
  late60: "l60",
  late90: "l90",
  dependents: "dep",
  realEstateLoans: "re",
};

export type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Applicant from the URL: a demo sample, optionally overridden field by field. */
export function applicantFromParams(sp: SearchParams): { applicant: Applicant; name: string; sampleId: string | null } {
  const sample = getSample(first(sp.sample)) ?? (Object.values(PARAM).some((p) => first(sp[p]) !== undefined) ? null : DEFAULT_SAMPLE);
  const applicant: Applicant = { ...(sample ?? DEFAULT_SAMPLE).applicant };
  let custom = false;
  for (const [key, p] of Object.entries(PARAM) as [FeatureKey, string][]) {
    const raw = first(sp[p]);
    if (raw === undefined) continue;
    const v = Number(raw);
    if (Number.isFinite(v) && v >= 0) {
      applicant[key] = v;
      custom = true;
    }
  }
  return {
    applicant,
    name: sample && !custom ? sample.name : first(sp.name) || "Applicant",
    sampleId: sample && !custom ? sample.id : null,
  };
}

export function paramsFor(applicant: Applicant, opts: { sampleId?: string | null; lang?: string; name?: string } = {}): string {
  const q = new URLSearchParams();
  if (opts.sampleId) q.set("sample", opts.sampleId);
  else {
    for (const [key, p] of Object.entries(PARAM) as [FeatureKey, string][]) q.set(p, String(Number(applicant[key].toFixed(4))));
    if (opts.name) q.set("name", opts.name);
  }
  if (opts.lang && opts.lang !== "en") q.set("lang", opts.lang);
  return q.toString();
}
