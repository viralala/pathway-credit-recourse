import { SheetHeading } from "@/components/pages/SectionHeading";
import { TRACKED } from "@/components/pages/typography";
import { money, tf, type Lang } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { nextTier, PRICING, type RateTier, type Savings } from "@/lib/pricing";
import { aprText, pagesText } from "@/lib/strings/pages";
import { cn } from "@/lib/utils";

const TONE = {
  declined: "bg-pastel-blush text-deep-blush",
  today: "bg-pastel-periwinkle text-deep-periwinkle",
  after: "bg-pastel-mint text-deep-mint",
} as const;

function PriceCard({
  heading,
  status,
  apr,
  note,
  emiLabel,
  emi,
  interestLabel,
  interest,
  tone,
}: {
  heading: string;
  status: string;
  apr: string;
  note?: string;
  emiLabel: string;
  emi: string;
  interestLabel: string;
  interest: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div className={cn("flex flex-col rounded-xl p-4", TONE[tone])}>
      <p className={cn("text-xs font-bold", TRACKED)}>{heading}</p>
      <p className="mt-2 text-sm font-semibold">{status}</p>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{apr}</p>
      {note ? <p className="text-xs">{note}</p> : null}
      <dl className="mt-3 space-y-1.5 border-t border-current/15 pt-3 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt>{emiLabel}</dt>
          <dd className="text-sm font-bold tabular-nums">{emi}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt>{interestLabel}</dt>
          <dd className="text-sm font-bold tabular-nums">{interest}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * "Money saved by following the plan" for the lender report: the same default loan priced today and
 * after the plan with the illustrative tiers in lib/pricing.ts. For an applicant who is already
 * approved it shows today's price and the next tier instead.
 */
export function MoneySavedBlock({
  lang,
  savings: sv,
  approved,
  score,
  horizon,
}: {
  lang: Lang;
  savings: Savings;
  /** Approved today: there is no plan, so show the price of credit today. */
  approved: boolean;
  /** Pathway score today. */
  score: number;
  horizon: number;
}) {
  const s = pagesText(lang);
  const m = s.money;
  const tierName = (t: RateTier | null) => (t ? tf(m.tier, { tier: s.tiers[t.id] }) : m.declined);
  const aprLine = (apr: number) => tf(m.apr, { v: aprText(apr) });
  const perMonth = (v: number) => tf(m.perMonth, { v: money(v) });
  const tiers = PRICING.tiers.map((t) => tf(m.tierItem, { score: t.minScore, apr: aprText(t.apr) })).join(" · ");
  const note = tf(m.note, { tiers });
  const declinedNote = tf(m.declinedNote, {
    threshold: MODEL.thresholdScore,
    alt: aprText(PRICING.declinedAlternativeApr),
  });

  if (approved) {
    const next = nextTier(score);
    return (
      <section aria-labelledby="money-title" className="break-inside-avoid">
        <SheetHeading id="money-title" tag={s.common.illustrative}>
          {m.titleApproved}
        </SheetHeading>
        <p className="mt-2 text-sm text-muted-foreground">
          {tf(m.loanApproved, { amount: money(sv.amount), months: sv.termMonths })}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <PriceCard
            heading={m.today}
            status={tierName(sv.todayTier)}
            apr={aprLine(sv.todayApr)}
            note={sv.todayDeclined ? m.alternative : undefined}
            emiLabel={m.emi}
            emi={perMonth(sv.todayEmi)}
            interestLabel={m.interest}
            interest={money(sv.todayInterest)}
            tone={sv.todayDeclined ? "declined" : "today"}
          />
          <div className="flex flex-col justify-center gap-2 rounded-xl bg-muted p-4 text-sm text-foreground">
            {sv.todayTier ? (
              <p className="font-semibold">
                {tf(m.approvedBody, { tier: s.tiers[sv.todayTier.id], apr: aprText(sv.todayApr) })}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {next
                ? tf(m.nextTier, { tier: s.tiers[next.id], apr: aprText(next.apr), score: next.minScore })
                : m.topTier}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="money-title" className="break-inside-avoid">
      <SheetHeading id="money-title" tag={s.common.illustrative}>
        {m.title}
      </SheetHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        {tf(m.loan, { amount: money(sv.amount), months: sv.termMonths })}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <PriceCard
          heading={m.today}
          status={tierName(sv.todayTier)}
          apr={aprLine(sv.todayApr)}
          note={sv.todayDeclined ? m.alternative : undefined}
          emiLabel={m.emi}
          emi={perMonth(sv.todayEmi)}
          interestLabel={m.interest}
          interest={money(sv.todayInterest)}
          tone={sv.todayDeclined ? "declined" : "today"}
        />
        <PriceCard
          heading={m.after}
          status={tierName(sv.planTier)}
          apr={aprLine(sv.planApr)}
          note={sv.planDeclined ? m.alternative : undefined}
          emiLabel={m.emi}
          emi={perMonth(sv.planEmi)}
          interestLabel={m.interest}
          interest={money(sv.planInterest)}
          tone={sv.planDeclined ? "declined" : "after"}
        />
        <div className="flex flex-col justify-center rounded-xl bg-money-soft p-4 text-money-foreground ring-1 ring-money/25 sm:col-span-2 lg:col-span-1">
          <p className={cn("text-xs font-bold", TRACKED)}>{m.saved}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{money(sv.saved)}</p>
          {sv.emiDrop > 0 ? <p className="mt-1 text-xs">{tf(m.emiDrop, { v: money(sv.emiDrop) })}</p> : null}
        </div>
      </div>
      {sv.planDeclined ? (
        <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs font-semibold text-warning-foreground">
          {tf(m.noSaving, { n: horizon })}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {note} {sv.todayDeclined ? declinedNote : null}
      </p>
    </section>
  );
}
