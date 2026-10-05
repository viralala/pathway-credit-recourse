import { ArrowRight, Calculator, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessModel } from "@/components/home/BusinessModel";
import { withLang } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { analyze, savingsView } from "@/lib/analyze";
import { actionText, asLang, reasonText, t, tf, type Lang } from "@/lib/i18n";
import { inr } from "@/lib/money";
import { PRICING } from "@/lib/pricing";
import { getSample } from "@/lib/samples";
import { homeStrings } from "@/lib/strings/home";
import { PARAM, type SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const EXAMPLE_ID = "clear-rejection";

/** Real engine output for the worked example, computed on the server. Nothing here is typed in by hand. */
function WorkedExample({ lang }: { lang: Lang }) {
  const s = homeStrings(lang).example;
  const ui = t(lang);
  const sample = getSample(EXAMPLE_ID)!;
  const r = analyze(sample.applicant);
  const saved = savingsView(r).savings.saved;
  const month = r.timeline.approvalMonth;

  return (
    <div className="rounded-xl border border-border border-t-4 border-t-chart-2 bg-card p-6 shadow-[0_18px_40px_-28px_rgb(9_60_68/0.55)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <p className="font-bold">{s.title}</p>
        <span className="rounded-md bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger-foreground">{ui.declined}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-b border-border pb-5">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">{s.score}</dt>
          <dd className="display mt-1 text-5xl tabular-nums">{Math.round(r.assessment.score)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">{s.needs}</dt>
          <dd className="display mt-1 text-5xl text-muted-foreground tabular-nums">{r.thresholdScore}</dd>
        </div>
      </dl>

      <p className="mt-5 text-xs font-semibold text-muted-foreground">{s.reasons}</p>
      <ol className="mt-2 grid gap-1.5 text-sm">
        {r.assessment.reasons.slice(0, 2).map((x, i) => (
          <li key={x.key} className="flex gap-2">
            <span className="font-bold text-primary tabular-nums">{i + 1}.</span>
            <span>{reasonText(lang, x.key, x.value)}</span>
          </li>
        ))}
      </ol>

      {r.plan ? (
        <>
          <p className="mt-5 text-xs font-semibold text-muted-foreground">{s.plan}</p>
          <ol className="mt-2 grid gap-1.5 text-sm">
            {r.plan.actions.map((a, i) => (
              <li key={a.key} className="flex gap-2">
                <span className="font-bold text-primary tabular-nums">{i + 1}.</span>
                <span>{actionText(lang, a)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">{s.approvedIn}</dt>
          <dd className="mt-1 text-lg font-extrabold text-success tabular-nums">{month === null ? "–" : tf(s.months, { n: month })}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">{tf(s.saved, { amount: inr(PRICING.defaultLoan.amount) })}</dt>
          <dd className="mt-1 text-lg font-extrabold text-money-foreground tabular-nums">{inr(saved)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  // Links shared before the redesign put the workbench at "/": send them to /check, query intact.
  const applicantKeys = ["sample", "name", ...Object.values(PARAM)];
  if (applicantKeys.some((k) => sp[k] !== undefined)) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
    redirect(`/check?${q}`);
  }

  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const h = homeStrings(lang);

  return (
    <div lang={lang}>
      <section aria-labelledby="home-title" className="ledger border-b border-border">
        <div className="page-container grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="eyebrow">{h.hero.eyebrow}</p>
            <h1 id="home-title" className="display mt-4 text-5xl text-balance sm:text-6xl lg:text-7xl">
              {h.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">{h.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-[15px] font-bold">
                <Link href={withLang("/check", lang)}>
                  {h.hero.cta}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 bg-card px-6 text-[15px] font-semibold">
                <Link href={withLang(`/check?sample=${EXAMPLE_ID}`, lang)}>{h.hero.sample}</Link>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5">
            <WorkedExample lang={lang} />
          </div>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="page-container py-16 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow">{h.steps.eyebrow}</p>
            <h2 id="steps-title" className="display mt-3 text-4xl sm:text-5xl">
              {h.steps.title}
            </h2>
          </div>
          <p className="font-serif text-lg leading-snug text-muted-foreground italic lg:col-span-4 lg:col-start-9">{h.steps.aside}</p>
        </div>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {h.steps.items.map((item) => (
            <li key={item.k} className="bg-card p-6 sm:p-8">
              <p className="display text-3xl text-primary">{item.k}</p>
              <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tools-title" className="border-y border-border bg-card">
        <div className="page-container py-16 sm:py-20">
          <p className="eyebrow">{h.tools.eyebrow}</p>
          <h2 id="tools-title" className="display mt-3 text-4xl sm:text-5xl">
            {h.tools.title}
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { href: "/goal", title: h.tools.goalTitle, body: h.tools.goalBody, Icon: Target },
              { href: "/offer-check", title: h.tools.offerTitle, body: h.tools.offerBody, Icon: Calculator },
            ].map(({ href, title, body, Icon }) => (
              <li key={href}>
                <Link
                  href={withLang(href, lang)}
                  className="group flex h-full flex-col rounded-xl border border-border bg-background p-6 transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/60 sm:p-8"
                >
                  <Icon aria-hidden className="size-6 text-primary" />
                  <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {h.tools.open}
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BusinessModel lang={lang} />
    </div>
  );
}
