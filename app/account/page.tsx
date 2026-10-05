import { Download, LogOut, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/pages/PageHero";
import { TRACKED } from "@/components/pages/typography";
import { withLang } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { ASSUMPTIONS } from "@/lib/config";
import { asLang, tf, type Lang } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { findRecourse } from "@/lib/recourse";
import { validateApplicant } from "@/lib/security/validate";
import { accountStrings } from "@/lib/strings/account";
import { createClient, getViewer } from "@/lib/supabase/server";
import type { CheckinRow, SavedPlanRow } from "@/lib/supabase/types";
import { simulate } from "@/lib/timeline";
import { paramsFor, type SearchParams } from "@/lib/url";
import { deleteAccount, deletePlan } from "./actions";

export const metadata: Metadata = {
  title: "My plans",
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN-u-nu-latn", mr: "mr-IN-u-nu-latn" };

function dateText(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(first(sp.lang));
  const s = accountStrings(lang).account;

  const supabase = await createClient();
  if (!supabase) redirect(withLang("/signin", lang));
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(withLang("/account", lang))}`);

  const [plansRes, checkinsRes] = await Promise.all([
    supabase.from("saved_plans").select("id, name, applicant, lang, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("plan_checkins").select("id, plan_id, applicant, score, created_at").order("created_at", { ascending: true }),
  ]);
  const failed = !!(plansRes.error || checkinsRes.error);
  const plans = (plansRes.data ?? []) as SavedPlanRow[];
  const checkins = (checkinsRes.data ?? []) as CheckinRow[];

  return (
    <div lang={lang}>
      <div className="page-container pt-6 sm:pt-10">
        <PageHero eyebrow={s.eyebrow} title={s.title} tone="mint">
          {viewer.email ? <p className="text-sm">{tf(s.signedInAs, { email: viewer.email })}</p> : null}
          {first(sp.error) === "delete-failed" ? (
            <p role="alert" className="mt-4 max-w-xl rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
              {s.deleteError}
            </p>
          ) : null}
        </PageHero>
      </div>

      <div className="page-container grid gap-10 py-10 lg:grid-cols-12">
        <section aria-label={s.title} className="lg:col-span-8">
          {failed ? (
            <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
              {s.loadError}
            </p>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-input bg-card p-8 text-center">
              <p className="text-muted-foreground">{s.empty}</p>
              <Button asChild className="mt-5 h-10 px-5">
                <Link href={withLang("/", lang)}>{s.emptyCta}</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-5">
              {plans.map((plan) => {
                const history = checkins.filter((c) => c.plan_id === plan.id);
                const firstScore = history[0]?.score ?? null;
                const last = history[history.length - 1];
                const parsed = validateApplicant(last?.applicant ?? plan.applicant);
                const latestApplicant = parsed.ok ? parsed.value : null;
                let status: string | null = null;
                if (latestApplicant) {
                  const r = findRecourse(latestApplicant);
                  if (r.status === "approved") status = s.approved;
                  else {
                    const month = simulate(latestApplicant, r.status === "plan" ? r.plan : null).approvalMonth;
                    status = month === null ? tf(s.noPlan, { n: ASSUMPTIONS.horizonMonths }) : tf(s.projected, { n: month });
                  }
                }
                const q = latestApplicant ? new URLSearchParams(paramsFor(latestApplicant, { lang, name: plan.name })) : new URLSearchParams();
                q.set("plan", plan.id);
                return (
                  <li key={plan.id} className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-extrabold">{plan.name}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{tf(s.lastUpdated, { date: dateText(plan.updated_at, lang) })}</p>
                      </div>
                      {status ? <p className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{status}</p> : null}
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-border py-4">
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">{s.started}</dt>
                        <dd className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">{firstScore ?? "–"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">{s.latest}</dt>
                        <dd className={`mt-1 text-3xl font-extrabold tracking-tight tabular-nums ${last && last.score >= MODEL.thresholdScore ? "text-success" : ""}`}>
                          {last?.score ?? "–"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">{s.history}</dt>
                        <dd className="mt-2 text-sm font-semibold">{tf(s.updates, { n: history.length })}</dd>
                      </div>
                    </dl>

                    {history.length > 1 ? (
                      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
                        {history.slice(-6).map((c) => (
                          <li key={c.id} className="rounded-md border border-border px-2 py-1 tabular-nums">
                            <span className="text-muted-foreground">{dateText(c.created_at, lang)}:</span> <strong>{c.score}</strong>
                          </li>
                        ))}
                      </ol>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button asChild className="h-10 rounded-lg px-4">
                        <Link href={`/?${q}`}>{s.update}</Link>
                      </Button>
                      <details className="group">
                        <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-danger-soft [&::-webkit-details-marker]:hidden">
                          <Trash2 aria-hidden className="size-4" />
                          {s.remove}
                        </summary>
                        <form action={deletePlan} className="mt-2">
                          <input type="hidden" name="id" value={plan.id} />
                          <input type="hidden" name="lang" value={lang} />
                          <Button type="submit" variant="destructive" className="h-9 px-3">
                            {s.removeConfirm}
                          </Button>
                        </form>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="grid content-start gap-5 lg:col-span-4">
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5">
            <h2 className={`text-xs font-bold text-muted-foreground ${TRACKED}`}>{s.data}</h2>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="h-10 justify-start px-3">
                <a href="/api/account/export" download>
                  <Download aria-hidden />
                  {s.download}
                </a>
              </Button>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline" className="h-10 w-full justify-start px-3">
                  <LogOut aria-hidden />
                  {s.signOut}
                </Button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 ring-1 ring-danger/30">
            <h2 className="font-bold text-danger">{s.deleteTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.deleteBody}</p>
            <form action={deleteAccount} className="mt-4 grid gap-3">
              <input type="hidden" name="lang" value={lang} />
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="confirm" value="yes" required className="mt-1 size-4 accent-[var(--destructive)]" />
                <span>{s.deleteConfirm}</span>
              </label>
              <Button type="submit" variant="destructive" className="h-10 px-4">
                {s.deleteButton}
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
