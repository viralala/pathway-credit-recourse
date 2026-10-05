"use server";

import { headers } from "next/headers";
import { parseEnquiry, type EnquiryField } from "@/lib/security/accountInput";
import { clientKey, createRateLimiter } from "@/lib/security/rateLimit";
import { createClient } from "@/lib/supabase/server";

export type EnquiryState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; errors: Partial<Record<EnquiryField, string>> }
  | { status: "error"; code: "throttled" | "generic" };

// Per server instance; the database function adds a per-address and global cap on top.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/**
 * The partner enquiry form. Next.js only accepts server action calls from this site's own pages.
 * The hidden "website" field is a honeypot: people never see it, form-filling bots do.
 */
export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (String(form.get("website") ?? "") !== "") return { status: "sent" };

  const parsed = parseEnquiry({
    name: form.get("name"),
    organisation: form.get("organisation"),
    email: form.get("email"),
    kind: form.get("kind"),
    message: form.get("message"),
  });
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  if (!limiter.check(clientKey(await headers())).ok) return { status: "error", code: "throttled" };

  const supabase = await createClient();
  if (!supabase) return { status: "error", code: "generic" };

  const e = parsed.value;
  const { error } = await supabase.rpc("submit_partner_enquiry", {
    p_name: e.name,
    p_organisation: e.organisation,
    p_email: e.email,
    p_kind: e.kind,
    p_message: e.message,
  });
  if (error) return { status: "error", code: error.message.includes("enquiry_throttled") ? "throttled" : "generic" };
  return { status: "sent" };
}
