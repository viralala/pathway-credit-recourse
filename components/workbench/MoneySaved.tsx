"use client";

import { Lightbulb, PiggyBank } from "lucide-react";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { savingsView, type Analysis } from "@/lib/analyze";
import { money, pricingRows, rate, splitAt, tf, tierText, type Lang, type UIStrings } from "@/lib/i18n";
import { PRICING } from "@/lib/pricing";
import { BorrowCard } from "./BorrowCard";
import { LoanControls } from "./LoanControls";
import { RowList } from "./RowList";
import { SectionHeading } from "./SectionHeading";
import { TierLadder, type LadderMarker } from "./TierLadder";

/** A translated sentence with an animated money figure where its {key} placeholder sits. */
function MoneySentence({ template, value, k = "amount", className }: { template: string; value: number; k?: string; className?: string }) {
  const [before, after] = splitAt(template, k);
  return (
    <p className={className}>
      {before}
      <CountUp value={value} format={money} className="rounded-lg bg-card/80 px-1.5 whitespace-nowrap tabular-nums" />
      {after}
    </p>
  );
}

/** Section 3: what the plan is worth in money, for a loan the applicant can size. Every rate is illustrative. */
export function MoneySaved({
  ui,
  lang,
  analysis,
}: {
  ui: UIStrings;
  lang: Lang;
  analysis: Pick<Analysis, "assessment" | "recourse" | "plan">;
}) {
  const s = ui.savings;
  const [amount, setAmount] = useState<number>(PRICING.defaultLoan.amount);
  const [term, setTerm] = useState<number>(PRICING.defaultLoan.termMonths);
  const view = useMemo(() => savingsView(analysis, { amount, termMonths: term }), [analysis, amount, term]);
  const { mode, savings: sv, next } = view;

  const afterTitle = mode === "plan" ? s.afterPlan : mode === "closest" ? s.afterClosest : s.atNextTier;
  const markers: LadderMarker[] = [
    { score: analysis.assessment.score, label: s.youToday, kind: "today" },
    ...(mode === "approved" ? [] : [{ score: view.scoreAfter, label: mode === "plan" ? s.youAfter : ui.closestPlan, kind: "after" as const }]),
  ];
  const nextVars = next
    ? { n: next.points, tier: tierText(lang, next.tier.id), apr: rate(next.tier.apr), amount: money(next.extraSaved) }
    : null;
  const hint =
    mode === "closest"
      ? nextVars && tf(s.closestGap, nextVars)
      : nextVars
        ? tf(s.nextHint, nextVars)
        : s.bestTier;

  return (
    <section id="savings" aria-labelledby="savings-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="savings-title" n={3} kicker={s.kicker} title={s.title} sub={s.sub} tone="butter" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
        <div className="grid content-start gap-6">
          <Reveal>
            <div className="overflow-hidden rounded-xl bg-card border border-border">
              <div className="flex gap-4 bg-money-soft p-6 text-money-foreground sm:p-8">
                <span aria-hidden className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-card/70 sm:grid">
                  <PiggyBank className="size-6" />
                </span>
                <div className="min-w-0">
                  {mode === "plan" && (
                    <>
                      <MoneySentence
                        template={s.headlineSave}
                        value={sv.saved}
                        className="text-2xl leading-snug font-extrabold tracking-tight text-balance sm:text-3xl"
                      />
                      <MoneySentence template={s.emiDrop} value={sv.emiDrop} className="mt-2 text-base font-medium" />
                    </>
                  )}
                  {mode === "closest" && (
                    <p className="text-xl leading-snug font-extrabold tracking-tight text-balance sm:text-2xl">
                      {tf(s.headlineClosest, { apr: rate(sv.todayApr) })}
                    </p>
                  )}
                  {mode === "approved" && (
                    <>
                      <MoneySentence
                        template={s.headlineApproved}
                        value={sv.todayInterest}
                        className="text-2xl leading-snug font-extrabold tracking-tight text-balance sm:text-3xl"
                      />
                      {sv.todayTier && (
                        <p className="mt-2 text-base font-medium">
                          {tf(s.approvedTier, { tier: tierText(lang, sv.todayTier.id), apr: rate(sv.todayApr) })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
                <LoanControls ui={ui} lang={lang} amount={amount} term={term} onAmount={setAmount} onTerm={setTerm} />
              </div>
            </div>
          </Reveal>

          <Stagger className="grid gap-4 sm:grid-cols-2">
            <StaggerItem className={mode === "approved" && !next ? "sm:col-span-2" : undefined}>
              <BorrowCard
                ui={ui}
                lang={lang}
                title={s.today}
                tone={sv.todayDeclined ? "declined" : "approved"}
                apr={sv.todayApr}
                tier={sv.todayTier}
                emi={sv.todayEmi}
                interest={sv.todayInterest}
              />
            </StaggerItem>
            {!(mode === "approved" && !next) && (
              <StaggerItem>
                <BorrowCard
                  ui={ui}
                  lang={lang}
                  title={afterTitle}
                  tone={mode === "approved" ? "next" : sv.planDeclined ? "declined" : "approved"}
                  apr={sv.planApr}
                  tier={sv.planTier}
                  emi={sv.planEmi}
                  interest={sv.planInterest}
                />
              </StaggerItem>
            )}
          </Stagger>

          {hint && (
            <Reveal>
              <p className="flex items-start gap-3 rounded-2xl bg-pastel-sky p-4 text-sm font-medium text-deep-sky">
                <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{hint}</span>
              </p>
            </Reveal>
          )}
        </div>

        <Reveal as="div" delay={0.1} className="grid content-start gap-4">
          <div className="rounded-xl bg-card p-5 border border-border sm:p-6">
            <TierLadder ui={ui} markers={markers} />
          </div>
          <div className="rounded-xl bg-card px-5 border border-border sm:px-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="pricing">
                <AccordionTrigger className="py-4 text-sm font-bold">{s.assumptions}</AccordionTrigger>
                <AccordionContent className="pb-5">
                  <RowList rows={pricingRows(lang)} />
                  <p className="mt-4 text-xs text-muted-foreground">{s.assumptionsNote}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
