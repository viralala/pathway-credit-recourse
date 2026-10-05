import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TRACKED } from "@/components/pages/typography";
import { withLang } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { asLang } from "@/lib/i18n";
import { safeNextPath } from "@/lib/security/redirect";
import { accountStrings, type AccountStrings } from "@/lib/strings/account";
import { shell } from "@/lib/strings/shell";
import { ACCOUNTS_ENABLED } from "@/lib/supabase/config";
import { createClient, getViewer } from "@/lib/supabase/server";
import type { SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to save plans and track your progress.",
  alternates: { canonical: "/signin" },
  robots: { index: false, follow: true },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
type ErrorCode = keyof AccountStrings["signin"]["errors"];
const ERRORS: ErrorCode[] = ["cancelled", "provider-disabled", "provider-failed", "session-failed", "unavailable"];

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(first(sp.lang));
  const s = accountStrings(lang).signin;
  const f = shell(lang).footer;
  const next = safeNextPath(first(sp.next));
  const errorParam = first(sp.error);
  // Only messages we wrote are shown; the code in the URL just picks one.
  const error = ERRORS.find((e) => e === errorParam);

  if (ACCOUNTS_ENABLED) {
    const supabase = await createClient();
    if (supabase && (await getViewer(supabase))) redirect(next ?? withLang("/account", lang));
  }

  const googleHref = `/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div lang={lang} className="page-container py-16 sm:py-24">
      <div>
        <div className="mx-auto max-w-lg rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:p-10">
          <p className={`text-xs font-bold text-deep-periwinkle ${TRACKED}`}>{s.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance">{s.title}</h1>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
              {s.errors[error]}
            </p>
          ) : null}

          {ACCOUNTS_ENABLED ? (
            <>
              <p className="mt-4 leading-relaxed text-muted-foreground">{s.body}</p>
              <Button asChild size="lg" className="mt-8 h-12 w-full rounded-xl text-[15px] font-bold">
                {/* A plain link, not next/link: starting a sign-in must never be prefetched. */}
                <a href={googleHref} rel="nofollow">
                  {s.google}
                </a>
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {s.legal}{" "}
                <Link href={withLang("/terms", lang)} className="font-semibold text-primary underline underline-offset-4">
                  {f.terms}
                </Link>{" "}
                ·{" "}
                <Link href={withLang("/privacy", lang)} className="font-semibold text-primary underline underline-offset-4">
                  {f.privacy}
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 leading-relaxed text-muted-foreground">{s.off}</p>
              <Button asChild size="lg" className="mt-8 h-12 rounded-xl px-6 text-[15px] font-bold">
                <Link href={withLang("/", lang)}>{s.offCta}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
