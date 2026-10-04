"use client";

import { CircleCheck, CircleAlert, TrendingUp } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { money, rate, tf, tierText, type Lang, type UIStrings } from "@/lib/i18n";
import type { RateTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type BorrowTone = "declined" | "approved" | "next";

const HEADER: Record<BorrowTone, string> = {
  declined: "bg-danger-soft text-danger-foreground",
  approved: "bg-success-soft text-success-foreground",
  next: "bg-pastel-sky text-deep-sky",
};
const ICON = { declined: CircleAlert, approved: CircleCheck, next: TrendingUp };

/** One side of the "borrow today vs after the plan" comparison. */
export function BorrowCard({
  ui,
  lang,
  title,
  tone,
  apr,
  tier,
  emi,
  interest,
}: {
  ui: UIStrings;
  lang: Lang;
  title: string;
  tone: BorrowTone;
  apr: number;
  /** null = declined by a prime lender, priced at the high-cost alternative. */
  tier: RateTier | null;
  emi: number;
  interest: number;
}) {
  const s = ui.savings;
  const Icon = ICON[tone];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <header className={cn("flex items-center justify-between gap-3 px-5 py-3", HEADER[tone])}>
        <h3 className="text-sm font-bold">{title}</h3>
        <Icon aria-hidden className="size-4 shrink-0" />
      </header>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold text-muted-foreground">{s.apr}</p>
        <p className="text-4xl font-extrabold tracking-tight tabular-nums">{rate(apr)}</p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          <span className="sr-only">{s.tierLabel}: </span>
          {tier ? tierText(lang, tier.id) : tf(s.declinedTier, { apr: rate(apr) })}
        </p>
        <dl className="mt-auto divide-y divide-border pt-4 text-sm">
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{s.emi}</dt>
            <dd className="font-bold tabular-nums">
              <CountUp value={emi} format={money} duration={0.5} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{s.interest}</dt>
            <dd className="font-bold tabular-nums">
              <CountUp value={interest} format={money} duration={0.5} />
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
