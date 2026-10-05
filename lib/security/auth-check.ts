import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface AuthContextResult {
  authenticated: boolean;
  user: User | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Validates the Supabase session on the server.
 * Never trusts a client-supplied user_id.
 */
export async function getAuthenticatedUser(): Promise<AuthContextResult> {
  const supabase = await createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { authenticated: false, user: null, supabase };
    }
    return { authenticated: true, user, supabase };
  } catch {
    return { authenticated: false, user: null, supabase };
  }
}
