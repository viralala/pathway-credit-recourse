import type { AAFetchResult, AAMode, ConsentStatus, DemoProfile } from "./types";

export interface CreateConsentInput {
  demoProfile?: DemoProfile;
  /** 10-digit Indian mobile number. Used once to create the consent; never stored, logged or echoed. */
  mobile?: string;
  /** Public origin of the site handling this request, for the consent redirect (e.g. https://pathway.example). */
  origin?: string;
}

export interface CreateConsentResult {
  consentId: string;
  mode: AAMode;
  redirectUrl: string | null;
}

export interface AAProvider {
  mode: AAMode;
  createConsent(input: CreateConsentInput): Promise<CreateConsentResult>;
  consentStatus(id: string): Promise<{ status: ConsentStatus; mode: AAMode }>;
  fetchData(id: string): Promise<AAFetchResult>;
}

export type AAErrorCode = "invalid_request" | "not_found" | "not_ready" | "upstream";

/** A failure the routes can turn into a clean HTTP error. The message never carries user data. */
export class AAError extends Error {
  constructor(
    public code: AAErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "AAError";
  }
}
