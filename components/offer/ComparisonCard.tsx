import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tf } from "@/lib/i18n";
import { compareWithPathway, formatMoney, formatRate, type Currency, type OfferAnalysis } from "@/lib/offer";
import type { OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { fillNodes } from "./fillNodes";
import { CARD } from "./styles";

/** Below this many currency units, two costs count as "about the same". */
const SAME = 0.5;

/**
 * The same money over the same dates at Pathway's illustrative "fair" and "excellent" tier rates,
 * with a call to action back to the main flow.
 */
export function ComparisonCard({
  a,
  currency,
  s,
  homeHref,
}: {
  a: OfferAnalysis;
  currency: Currency;
  s: OfferStrings;
  homeHref: string;
}) {
  const c = compareWithPathway(a);
  const money = (v: number) => formatMoney(v, currency);
  const rate = (v: number) => formatRate(v, currency);
  const cheaper = c.fair.extra > SAME;

  const rows = [
    { key: "offer", label: s.thisOffer, apr: rate(a.apr), cost: a.costOfCredit, diff: null as number | null, bar: "bg-chart-5" },
    {
      key: "fair",
      label: tf(s.tierRow, { tier: s.tierNames.fair, apr: rate(c.fair.tier.apr) }),
      apr: null,
      cost: c.fair.cost,
      diff: c.fair.extra,
      bar: "bg-chart-1",
    },
    {
      key: "excellent",
      label: tf(s.tierRow, { tier: s.tierNames.excellent, apr: rate(c.excellent.tier.apr) }),
      apr: null,
      cost: c.excellent.cost,
      diff: c.excellent.extra,
      bar: "bg-chart-3",
    },
  ];
  const maxCost = Math.max(...rows.map((r) => Math.max(0, r.cost)), 1);

  const diffText = (d: number) =>
    d > SAME ? tf(s.less, { amount: money(d) }) : d < -SAME ? tf(s.more, { amount: money(-d) }) : s.same;

  return (
    <Card className={CARD}>
      <CardHeader className="gap-1">
        <h3 className="text-base font-semibold">{s.compareTitle}</h3>
      </CardHeader>
      {/* Mobile: headline, bars, call to action. From md: headline and CTA left, bars right. */}
      <CardContent className="grid gap-6 md:grid-cols-2 md:items-start md:gap-x-8">
        <div className={cn("rounded-xl p-4", cheaper ? "bg-money-soft text-money-foreground" : "bg-success-soft text-success-foreground")}>
          <p className="flex items-start gap-2 text-base leading-snug font-semibold">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              {cheaper
                ? fillNodes(s.compareLess, { amount: <span className="font-extrabold tabular-nums">{money(c.fair.extra)}</span> })
                : s.compareNotLess}
            </span>
          </p>
          <p className="mt-1.5 pl-7 text-sm">{tf(s.compareBody, { received: money(a.received) })}</p>
        </div>

        <ul className="grid gap-4 md:col-start-2 md:row-span-2 md:row-start-1">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                <span className="font-medium">
                  {r.label}
                  {r.apr && <span className="ml-1.5 text-muted-foreground tabular-nums">· {r.apr} APR</span>}
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold">{tf(s.costLabel, { cost: money(r.cost) })}</span>
                  {r.diff !== null && <span className="ml-2 text-muted-foreground">({diffText(r.diff)})</span>}
                </span>
              </div>
              <div aria-hidden className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700 ease-out", r.bar)}
                  style={{ width: `${(Math.max(0, r.cost) / maxCost) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-start gap-3 md:col-start-1 md:row-start-2">
          <Button asChild size="lg" className="h-auto min-h-10 rounded-xl px-4 py-2 whitespace-normal">
            <Link href={homeHref}>
              {s.compareCta}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <p className="text-xs leading-snug text-muted-foreground">{s.compareNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}
