import "server-only";
import { setuFetch } from "./client";
import type {
  SetuConsentCreateRequest,
  SetuConsentCreateResponse,
  SetuConsentStatusResponse,
} from "./types";

/**
 * Creates a Setu Account Aggregator Consent Request.
 * Requests read-only, one-time consented access to 6 months of deposit account summaries and transactions.
 */
export async function createSetuConsent(params: {
  customerPhone?: string;
  redirectUrl?: string;
  purposeText?: string;
}): Promise<{
  success: boolean;
  consentId?: string;
  url?: string;
  status?: string;
  error?: string;
}> {
  const phone = params.customerPhone?.replace(/\D/g, "") || "9876543210";
  const customerId = phone.includes("@") ? phone : `${phone}@setu`;

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const payload: SetuConsentCreateRequest = {
    Detail: {
      consentMode: "STORE",
      fetchType: "ONETIME",
      consentTypes: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
      fiTypes: ["DEPOSIT"],
      Customer: {
        id: customerId,
      },
      Purpose: {
        code: "101",
        refUri: "https://api.rebit.org.in/aa/purpose/101.xml",
        text: params.purposeText || "Credit assessment and loan recourse planning",
        Category: {
          type: "string",
        },
      },
      FIDataRange: {
        from: sixMonthsAgo.toISOString(),
        to: now.toISOString(),
      },
      DataLife: {
        unit: "MONTH",
        value: 1,
      },
      Frequency: {
        unit: "MONTH",
        value: 1,
      },
    },
    redirectUrl: params.redirectUrl,
  };

  const response = await setuFetch<SetuConsentCreateResponse>("/v2/consents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    // If testing in sandbox without live credentials configured, provide a clear structured response
    return {
      success: false,
      error: response.error || "Unable to initiate Setu AA consent request.",
    };
  }

  return {
    success: true,
    consentId: response.data.id,
    url: response.data.url,
    status: response.data.status,
  };
}

/**
 * Retrieves the status of an existing consent request from Setu.
 */
export async function getSetuConsentStatus(consentId: string): Promise<{
  success: boolean;
  status?: string;
  approvedAt?: string;
  expiresAt?: string;
  error?: string;
}> {
  if (!consentId || typeof consentId !== "string") {
    return { success: false, error: "Valid consentId is required" };
  }

  const response = await setuFetch<SetuConsentStatusResponse>(`/v2/consents/${encodeURIComponent(consentId)}`, {
    method: "GET",
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to fetch Setu consent status.",
    };
  }

  return {
    success: true,
    status: response.data.status,
    approvedAt: response.data.approvedAt,
    expiresAt: response.data.expiresAt,
  };
}

/**
 * Programmatically revokes an active Setu consent.
 */
export async function revokeSetuConsent(consentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!consentId || typeof consentId !== "string") {
    return { success: false, error: "Valid consentId is required" };
  }

  const response = await setuFetch<{ success: boolean; status: string }>(
    `/v2/consents/${encodeURIComponent(consentId)}/revoke`,
    {
      method: "POST",
    }
  );

  return {
    success: response.success,
    error: response.error,
  };
}
