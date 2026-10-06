import type { Applicant, FeatureKey } from "@/lib/types";

/** `sandbox` serves fictional demo data; `setu` talks to Setu's Account Aggregator gateway. */
export type AAMode = "sandbox" | "setu";

/** The three fictional borrowers the sandbox can pretend to be. */
export type DemoProfile = "salaried" | "stretched" | "thin-file";

export type FieldOrigin = "bank-statement" | "credit-card" | "loan-account" | "not-available";

/** Where one model input came from. `detail` is short plain English, e.g. "Median salary credit, last 12 months". */
export interface FieldSource {
  origin: FieldOrigin;
  detail: string;
}

export interface LinkedAccount {
  kind: "deposit" | "credit-card" | "loan";
  institution: string;
  /** Masked account number, e.g. "XXXX1234". */
  masked: string;
}

/** What the connect flow hands back: the seven model inputs plus where each one came from. */
export interface AAFetchResult {
  mode: AAMode;
  applicant: Applicant;
  sources: Partial<Record<FeatureKey, FieldSource>>;
  /** ISO dates (YYYY-MM-DD) covered by the data. */
  period: { from: string; to: string };
  accounts: LinkedAccount[];
  /** Account holder's name from the shared profile, when the bank sent one. Shown in the form, never stored. */
  holderName?: string;
}

export type ConsentStatus = "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";
