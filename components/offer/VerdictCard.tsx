"use client";

import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/motion/CountUp";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tf } from "@/lib/i18n";
import { RATE_DISPLAY_CAP, formatMoney, formatRate, type Currency, type OfferAnalysis } from "@/lib/offer";
import { daysText, periodText, type OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { fillNodes } from "./fillNodes";
import { CARD, VERDICT_STYLE } from "./styles";

/** The headline result: true APR, the cost verdict, a plain-language story and the key numbers. */
export function VerdictCard({ a, currency, s }: { a: OfferAnalysis; currency: Currency; s: OfferStrings }) {
  const reduce = useReducedMotion();
  const style = VERDICT_STYLE[a.verdict];
  const Icon = style.icon;
  const money = (v: number) => formatMoney(v, currency);
  const rate = (v: number) => formatRate(v, currency);
  const capped = !Number.isFinite(a.apr) || a.apr >= RATE_DISPLAY_CAP;
  const aprText = rate(a.apr);
  const strong = (t: string) => <strong className="font-semibold text-foreground">{t}</strong>;

  const storyVars = {
    received: strong(money(a.received)),
    repaid: strong(money(a.totalRepaid)),
    period: periodText(s, a.tenureDays),
    cost: strong(money(a.costOfCredit)),
    apr: strong(aprText),
  };

  const stats = [
    { k: s.stats.received, v: money(a.received) },
    { k: s.stats.repaid, v: money(a.totalRepaid) },
    { k: s.stats.cost, v: money(a.costOfCredit) },
    { k: s.stats.costShare, v: rate(a.costShareOfReceived) },
    { k: s.stats.feeShare, v: tf(s.feeShareValue, { amount: money(a.deductions.total), share: rate(a.feeShareOfSanction) }) },
    { k: s.stats.tenure, v: daysText(s, a.tenureDays) },
  ];

  return (
    <Card className={CARD}>
      <CardHeader>
        <h2 id="offer-results-title" className="text-lg font-semibold">
          {s.resultsTitle}
        </h2>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{s.trueApr}</p>
            <p
              className={cn(
                "mt-1 font-extrabold tracking-tight tabular-nums",
                aprText.length > 8 ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl",
              )}
            >
              {capped ? aprText : <CountUp value={a.apr} format={rate} />}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{s.trueAprHint}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {s.stats.ear}: <span className="font-semibold text-foreground tabular-nums">{rate(a.effectiveAnnualRate)}</span>
            </p>
          </div>
          <motion.div
            key={a.verdict}
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn("rounded-xl p-4", style.box)}
          >
            <p className="text-xs font-medium opacity-80">{s.verdictLabel}</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-bold">
              <Icon aria-hidden className="size-5 shrink-0" />
              {s.verdicts[a.verdict]}
            </p>
            <p className="mt-1.5 text-sm leading-snug">{s.verdictBody[a.verdict]}</p>
          </motion.div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {fillNodes(a.costOfCredit > 0 ? s.story : s.storyFree, storyVars)}
        </p>

        <dl className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 xl:grid-cols-3">
          {stats.map((x) => (
            <div key={x.k} className="rounded-xl bg-muted/60 px-3 py-2.5">
              <dt className="text-xs leading-snug text-muted-foreground">{x.k}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{x.v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
