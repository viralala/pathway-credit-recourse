import { apiError, apiSuccess } from "@/lib/security/api-response";
import { getSchemeProvider } from "@/lib/schemes/repository";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const idOrSlug = params.id?.trim();

    if (!idOrSlug) {
      return apiError("VALIDATION_ERROR", "Missing scheme identifier", 400);
    }

    const provider = getSchemeProvider();
    const scheme = await provider.getSchemeById(idOrSlug);

    if (!scheme) {
      return apiError("NOT_FOUND", `Government scheme '${idOrSlug}' not found`, 404);
    }

    return apiSuccess({ scheme });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error retrieving scheme details";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
