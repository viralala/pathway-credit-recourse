"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asLang } from "@/lib/i18n";
import { isUuid } from "@/lib/security/accountInput";
import { createClient, getViewer } from "@/lib/supabase/server";

/*
 * Server actions for "My plans". Next.js checks that every action call comes from this site's own
 * pages (the Origin must match the Host), and each action asks the auth server who is calling
 * before it touches anything. Row level security then limits every delete to the caller's rows.
 */

const langOf = (form: FormData) => asLang(String(form.get("lang") ?? ""));
const accountPath = (lang: string) => (lang === "en" ? "/account" : `/account?lang=${lang}`);

/** Deletes one saved plan; its check-ins go with it (on delete cascade). */
export async function deletePlan(form: FormData): Promise<void> {
  const lang = langOf(form);
  const id = form.get("id");
  const supabase = await createClient();
  if (!supabase || !(await getViewer(supabase))) redirect("/signin?next=/account");
  if (isUuid(id)) await supabase.from("saved_plans").delete().eq("id", id);
  revalidatePath("/account");
  redirect(accountPath(lang));
}

/** Deletes the account and everything stored with it, then signs this browser out. */
export async function deleteAccount(form: FormData): Promise<void> {
  if (form.get("confirm") !== "yes") redirect(accountPath(langOf(form)));
  const supabase = await createClient();
  if (!supabase || !(await getViewer(supabase))) redirect("/signin?next=/account");
  const { error } = await supabase.rpc("delete_my_account");
  if (error) redirect(`${accountPath(langOf(form))}${langOf(form) === "en" ? "?" : "&"}error=delete-failed`);
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/");
}
