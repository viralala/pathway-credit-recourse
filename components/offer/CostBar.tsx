import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { tf } from "@/lib/i18n";
import { costBreakdown, formatMoney, type Currency, type OfferAnalysis } from "@/lib/offer";
import type { OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { CARD, SEGMENT_STYLE, type SegmentKind } from "./styles";

function Segment({ kind, share }: { kind: SegmentKind; share: number }) {
  const st = SEGMENT_STYLE[kind];
  return (
    <div
      className={cn("h-full shadow-[inset_-2px_0_0_var(--card)] transition-[width] duration-700 ease-out last:shadow-none", st.className)}
      style={{ ...st.style, width: `${Math.max(0, share) * 100}%` }}
    />
  );
}

function Row({ label, total, children }: { label: string; total: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{total}</span>
      </div>
      <div className="flex h-7 w-full overflow-hidden rounded-lg bg-muted">{children}</div>
    </div>
  );
}

/**
 * "What you get vs what you pay": the amount received next to the total repaid, with the repaid
 * bar split into the money you got back, fees you never received, and interest. Bars share a
 * scale, so the extra length of the second bar is the cost of the loan.
 */
export function CostBar({ a, currency, s }: { a: OfferAnalysis; currency: Currency; s: OfferStrings }) {
  const b = costBreakdown(a);
  const money = (v: number) => formatMoney(v, currency);
  const max = Math.max(a.received, a.totalRepaid) || 1;
  const legend: { kind: SegmentKind; label: string; value: number }[] = [
    { kind: "principal", label: s.barReceived, value: b.principal },
    { kind: "fees", label: s.barFees, value: b.fees },
    { kind: "interest", label: s.barInterest, value: b.interest },
  ];
  const aria = tf(s.barAria, {
    received: money(a.received),
    repaid: money(a.totalRepaid),
    principal: money(b.principal),
    fees: money(b.fees),
    interest: money(b.interest),
  });

  return (
    <Card className={CARD}>
      <CardHeader>
        <h3 className="text-base font-semibold">{s.barTitle}</h3>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div role="img" aria-label={aria} className="grid gap-4">
          <Row label={s.barGet} total={money(a.received)}>
            <Segment kind="principal" share={a.received / max} />
          </Row>
          <Row label={s.barPay} total={money(a.totalRepaid)}>
            <Segment kind="principal" share={b.principal / max} />
            <Segment kind="fees" share={b.fees / max} />
            <Segment kind="interest" share={b.interest / max} />
          </Row>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          {legend.map((l) => {
            const st = SEGMENT_STYLE[l.kind];
            return (
              <li key={l.kind} className="flex items-start gap-2">
                <span aria-hidden className={cn("mt-0.5 size-4 shrink-0 rounded", st.className)} style={st.style} />
                <span className="grid">
                  <span className="leading-snug text-muted-foreground">{l.label}</span>
                  <span className="font-semibold tabular-nums">{money(l.value)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
