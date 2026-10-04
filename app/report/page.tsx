import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleX } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { CertaintyBlock } from "@/components/pages/CertaintyBlock";
import { MoneySavedBlock } from "@/components/pages/MoneySavedBlock";
import { SheetHeading } from "@/components/pages/SectionHeading";
import { TRACKED } from "@/components/pages/typography";
import { PrintButton } from "@/components/PrintButton";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { analyze } from "@/lib/analyze";
import { actionText, asLang, displayValue, pct, reasonText, summaryText, t, tf } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { simulateUncertainty } from "@/lib/montecarlo";
import { moneySaved } from "@/lib/pricing";
import { asDataSource, assumptionItems, hrefWithLang, pagesText } from "@/lib/strings/pages";
import type { FeatureKey } from "@/lib/types";
import { applicantFromParams, paramsFor, type SearchParams } from "@/lib/url";
import { cn } from "@/lib/utils";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = { title: "Lender report" };

const FIELDS: FeatureKey[] = [
  "monthlyIncome",
  "utilization",
  "debtRatio",
  "openCreditLines",
  "late30",
  "late60",
  "late90",
  "age",
  "dependents",
  "realEstateLoans",
];

export default async function ReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const ui = t(lang);
  const s = pagesText(lang);
  const h = s.report;
  const { applicant, name, sampleId } = applicantFromParams(sp);
  const r = analyze(applicant);
  const a = r.assessment;
  const ref = `PW-${(sampleId ?? "custom").toUpperCase()}-${Math.round(a.score)}`;
  const summary = summaryText(lang, {
    name,
    approved: a.approved,
    score: a.score,
    threshold: r.thresholdScore,
    topReason: a.reasons[0] ? { key: a.reasons[0].key, value: a.reasons[0].value } : null,
    approvalMonth: r.timeline.approvalMonth,
    horizon: r.horizon,
  });
  const milestones = [0, 3, 6, 12, 18, 24, 36].filter((m) => m <= r.horizon).map((m) => r.timeline.points[m]);
  const declinedWithPlan = !a.approved && r.plan !== null;
  const savings = moneySaved({ scoreToday: a.score, scoreAfter: declinedWithPlan && r.plan ? r.plan.scoreAfter : a.score });
  const band = declinedWithPlan ? simulateUncertainty(applicant, r.plan) : null;

  return (
    <div lang={lang} className="page-container py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="no-print mb-5 space-y-4">
          <Breadcrumbs items={[{ label: s.crumbs.report }]} homeHref={hrefWithLang("/", lang)} homeLabel={s.crumbs.home} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" className="-ml-2 h-10 rounded-xl px-3 text-primary">
              <Link href={`/?${paramsFor(applicant, { sampleId, lang, name })}`}>
                <ArrowLeft aria-hidden />
                {h.back}
              </Link>
            </Button>
            <PrintButton label={h.print} />
          </div>
        </div>

        <Reveal className="print:transform-none! print:opacity-100!">
          <article className="print-sheet overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:p-10">
            <div aria-hidden className="-mx-5 -mt-5 mb-6 h-1.5 bg-linear-to-r from-pastel-periwinkle via-pastel-lavender to-pastel-peach sm:-mx-10 sm:-mt-10" />
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
              <div className="min-w-0">
                <p className={cn("text-xs font-bold text-deep-lavender", TRACKED)}>{h.sub}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl">{h.title}</h1>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                <p className="font-bold text-foreground">{h.lender}</p>
                <p>{tf(h.ref, { ref })}</p>
                <p>{tf(h.trained, { date: MODEL.trainedAt.slice(0, 10) })}</p>
              </div>
            </header>

            <section className="mt-6 grid grid-cols-1 gap-6 break-inside-avoid sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div>
                <SheetHeading>{h.decision}</SheetHeading>
                <p className="mt-2 leading-relaxed text-foreground">{summary}</p>
              </div>
              <div
                className={cn(
                  "rounded-xl p-4",
                  a.approved ? "bg-success-soft text-success-foreground" : "bg-danger-soft text-danger-foreground",
                )}
              >
                <p
                  className={cn("flex items-center gap-1.5 text-xs font-bold", TRACKED)}
                  data-decision={a.approved ? "approved" : "declined"}
                >
                  {a.approved ? <CircleCheck aria-hidden className="size-4" /> : <CircleX aria-hidden className="size-4" />}
                  {a.approved ? ui.approved : ui.declined}
                </p>
                <p className="mt-2 text-4xl font-extrabold tabular-nums">{Math.round(a.score)}</p>
                <p className="text-xs">
                  {ui.threshold} {r.thresholdScore} · {ui.pd} {pct(a.pd, 1)}
                </p>
              </div>
            </section>

            <section className="mt-8 break-inside-avoid">
              <SheetHeading>{h.reasons}</SheetHeading>
              {a.reasons.length === 0 ? (
                <p className="mt-2 text-muted-foreground">{ui.noReasons}</p>
              ) : (
                <ol className="mt-2 divide-y divide-border border-y border-border">
                  {a.reasons.map((x, i) => (
                    <li key={x.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3 py-3">
                      <span className="mt-0.5 w-fit rounded-md bg-pastel-periwinkle px-1.5 py-0.5 text-xs font-extrabold text-deep-periwinkle">
                        R{i + 1}
                      </span>
                      <span className="min-w-0">
                        <strong className="text-foreground">{ui.fields[x.key]}</strong>
                        <span className="block text-sm text-muted-foreground">{reasonText(lang, x.key, x.value)}</span>
                      </span>
                      <span className="text-sm font-bold whitespace-nowrap text-danger-foreground tabular-nums">
                        {tf(h.points, { n: Math.round(x.points) })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {declinedWithPlan && r.plan && (
              <section className="mt-8 grid grid-cols-1 gap-6 break-inside-avoid sm:grid-cols-2">
                <div>
                  <SheetHeading>{h.plan}</SheetHeading>
                  <ol className="mt-3 space-y-2.5">
                    {r.plan.actions.map((act, i) => (
                      <li key={act.key} className="flex gap-3 text-sm">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-pastel-peach text-xs font-extrabold text-deep-peach">
                          {i + 1}
                        </span>
                        <span className="text-foreground">
                          {actionText(lang, act)}{" "}
                          <span className="text-muted-foreground">
                            ({act.months} {ui.monthsShort})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {ui.never}: {ui.neverList}
                  </p>
                </div>
                <div>
                  <SheetHeading>{h.timeline}</SheetHeading>
                  <p className="mt-2 font-bold text-primary">
                    {r.timeline.approvalMonth === null
                      ? tf(ui.noPlan, { n: r.horizon })
                      : tf(ui.approvedIn, { n: r.timeline.approvalMonth })}
                  </p>
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th scope="col" className="py-1.5 font-semibold">
                          {ui.month}
                        </th>
                        <th scope="col" className="py-1.5 text-right font-semibold">
                          {ui.withPlan}
                        </th>
                        <th scope="col" className="py-1.5 text-right font-semibold">
                          {ui.withoutPlan}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((p) => (
                        <tr key={p.month} className="border-b border-border/60">
                          <td className="py-1.5 tabular-nums">{p.month}</td>
                          <td
                            className={cn(
                              "py-1.5 text-right tabular-nums",
                              p.approved ? "font-bold text-success-foreground" : "font-semibold text-foreground",
                            )}
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {p.approved ? <CircleCheck aria-hidden className="size-3.5" /> : null}
                              {Math.round(p.score)}
                              {p.approved ? <span className="sr-only"> ({ui.approved})</span> : null}
                            </span>
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground tabular-nums">{Math.round(p.baselineScore)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="mt-8 rounded-2xl bg-background p-4 ring-1 ring-foreground/5 sm:p-6">
              <MoneySavedBlock lang={lang} savings={savings} approved={a.approved} score={a.score} horizon={r.horizon} />
              {band ? (
                <div className="mt-8 border-t border-border pt-6">
                  <CertaintyBlock lang={lang} band={band} horizon={r.horizon} />
                </div>
              ) : null}
            </div>

            <section className="mt-8 grid grid-cols-1 gap-6 break-inside-avoid sm:grid-cols-2">
              <div>
                <SheetHeading>{h.applicant}</SheetHeading>
                <dl className="mt-2 grid grid-cols-1 gap-x-4 text-sm min-[480px]:grid-cols-2">
                  {FIELDS.map((k) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-border/70 py-1.5">
                      <dt className="text-muted-foreground">{ui.fields[k]}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">{displayValue(k, applicant[k])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <SheetHeading>{h.assumptions}</SheetHeading>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {assumptionItems(lang).map((x) => (
                    <li key={x.key}>
                      <strong className="text-foreground">{x.label}:</strong> {x.value}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 break-inside-avoid border-t border-border pt-5 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <SheetHeading>{h.model}</SheetHeading>
                <p className="mt-1.5">
                  {tf(h.modelBody, { source: s.sources[asDataSource(metrics.dataSource)], auc: metrics.auc })}
                </p>
              </div>
              <div>
                <SheetHeading>{h.rights}</SheetHeading>
                <p className="mt-1.5">{h.rightsBody}</p>
              </div>
              <p className="rounded-xl bg-pastel-butter px-4 py-3 font-semibold text-deep-butter sm:col-span-2">{ui.disclaimer}</p>
            </section>
          </article>
        </Reveal>
      </div>
    </div>
  );
}
