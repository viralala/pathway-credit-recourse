import { apiError, apiSuccess } from "@/lib/security/api-response";
import { getSchemeProvider } from "@/lib/schemes/repository";
import type { SchemeCategory, SchemeFilter } from "@/lib/schemes/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as SchemeCategory | null;
    const state = searchParams.get("state");
    const governmentLevel = searchParams.get("governmentLevel") as "central" | "state" | null;
    const purpose = searchParams.get("purpose");

    const filter: SchemeFilter = {
      activeOnly: true,
      category: category || undefined,
      state: state || undefined,
      governmentLevel: governmentLevel || undefined,
      purpose: purpose || undefined,
    };

    const provider = getSchemeProvider();
    const schemes = await provider.getSchemes(filter);

    return apiSuccess({
      count: schemes.length,
      schemes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error fetching government schemes";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
