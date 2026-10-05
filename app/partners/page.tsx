import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BusinessModel } from "@/components/home/BusinessModel";
import { EnquiryForm } from "@/components/partners/EnquiryForm";
import { withLang } from "@/components/site/nav";
import { asLang } from "@/lib/i18n";
import { ISSUES_URL } from "@/lib/site";
import { accountStrings } from "@/lib/strings/account";
import { shell } from "@/lib/strings/shell";
import { ACCOUNTS_ENABLED } from "@/lib/supabase/config";
import type { SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  title: "For lenders",
  description:
    "Plain-language reasons, rejection letters in English, Hindi and Marathi, and a fairness audit for every declined application. Pathway's business model and how to start a pilot.",
  alternates: { canonical: "/partners" },
};

export default async function PartnersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const s = accountStrings(lang).partners;

  return (
    <div lang={lang}>
      <section aria-labelledby="partners-title" className="ledger border-b border-border">
        <div className="page-container grid gap-10 py-12 sm:py-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">{s.eyebrow}</p>
            <h1 id="partners-title" className="display mt-4 text-4xl text-balance sm:text-5xl lg:text-6xl">
              {s.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="eyebrow">{s.pilotTitle}</h2>
              <ul className="mt-4 grid gap-4">
                {s.pilot.map((p) => (
                  <li key={p.href} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <p className="text-sm leading-relaxed">{p.text}</p>
                    <Link href={withLang(p.href, lang)} className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {p.link}
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <BusinessModel lang={lang} />

      <section aria-labelledby="enquiry-title" className="border-t border-border bg-card">
        <div className="page-container grid gap-8 py-16 sm:py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="enquiry-title" className="display text-4xl sm:text-5xl">
              {s.formTitle}
            </h2>
          </div>
          <div className="lg:col-span-8">
            {ACCOUNTS_ENABLED ? (
              <EnquiryForm lang={lang} />
            ) : (
              <p className="text-muted-foreground">
                {s.off}{" "}
                <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
                  {s.offLink}
                  <span className="sr-only"> {shell(lang).footer.newTab}</span>
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
