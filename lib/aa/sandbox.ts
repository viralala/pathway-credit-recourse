import { buildFixture, DEMO_PROFILES, sandboxPeriod } from "./fixtures";
import { linkedAccounts, normalize } from "./normalize";
import { AAError, type AAProvider } from "./provider";
import type { DemoProfile } from "./types";

/** "sbx_<profile>_<random>": stateless, so a serverless instance that never saw the consent can still serve it. */
const ID_RE = /^sbx_(salaried|stretched|thin-file)_[a-z0-9]{8,32}$/;

const randomSuffix = () => globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export function sandboxProfileOf(consentId: string): DemoProfile | null {
  const m = ID_RE.exec(consentId);
  return m ? (m[1] as DemoProfile) : null;
}

export const sandboxProvider: AAProvider = {
  mode: "sandbox",

  async createConsent({ demoProfile }) {
    if (!demoProfile || !DEMO_PROFILES.includes(demoProfile)) throw new AAError("invalid_request", "demoProfile required");
    return { consentId: `sbx_${demoProfile}_${randomSuffix()}`, mode: "sandbox", redirectUrl: null };
  },

  async consentStatus(id) {
    if (!sandboxProfileOf(id)) throw new AAError("not_found");
    return { status: "ACTIVE", mode: "sandbox" };
  },

  async fetchData(id) {
    const profile = sandboxProfileOf(id);
    if (!profile) throw new AAError("not_found");
    const data = buildFixture(profile, sandboxPeriod());
    const { applicant, sources } = normalize(data);
    return { mode: "sandbox", applicant, sources, period: data.period, accounts: linkedAccounts(data) };
  },
};
