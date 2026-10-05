import { SheetHeading } from "@/components/pages/SectionHeading";
import { UNCERTAINTY } from "@/lib/config";
import { pct, tf, type Lang } from "@/lib/i18n";
import type { UncertaintyBand } from "@/lib/montecarlo";
import { pagesText } from "@/lib/strings/pages";
import { cn } from "@/lib/utils";

/**
 * Best / likely / worst approval month on a 0…horizon axis. Pure HTML so it prints exactly as shown.
 * A null month means "not approved within the horizon": the band then runs off the right edge.
 */
function MonthRange({
  low,
  mid,
  high,
  horizon,
  ariaLabel,
  axisLabel,
  legendRange,
  legendLikely,
}: {
  low: number | null;
  mid: number | null;
  high: number | null;
  horizon: number;
  ariaLabel: string;
  axisLabel: string;
  legendRange: string;
  legendLikely: string;
}) {
  const at = (m: number) => (Math.min(Math.max(m, 0), horizon) / horizon) * 100;
  const ticks: number[] = [];
  for (let m = 0; m < horizon; m += 6) ticks.push(m);
  ticks.push(horizon);
  const start = low === null ? null : at(low);
  const end = high === null ? 100 : at(high);
  const open = high === null;

  return (
    <figure className="mt-4">
      <div role="img" aria-label={ariaLabel} className="px-3">
        <div aria-hidden className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
          {start !== null ? (
            <div
              className={cn(
                "absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-pastel-periwinkle ring-1 ring-deep-periwinkle/30",
                open && "rounded-r-none border-r-2 border-dashed border-deep-periwinkle",
              )}
              style={{ left: `${start}%`, width: `${Math.max(end - start, 1.5)}%` }}
            />
          ) : null}
          {mid !== null ? (
            <div
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-card"
              style={{ left: `${at(mid)}%` }}
            />
          ) : null}
        </div>
        <div aria-hidden className="relative mt-1 h-4 text-[0.65rem] text-muted-foreground tabular-nums">
          {ticks.map((m) => (
            <span key={m} className="absolute -translate-x-1/2" style={{ left: `${at(m)}%` }}>
              {m === horizon && open ? `${m}+` : m}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
        <span>{axisLabel}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-5 rounded-full bg-pastel-periwinkle ring-1 ring-deep-periwinkle/30" />
            {legendRange}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-full bg-primary" />
            {legendLikely}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * "Timeline certainty" for the lender report: the Monte Carlo band from lib/montecarlo summarised as
 * best / likely / worst approval month plus the share of simulated futures approved within the horizon.
 */
export function CertaintyBlock({ lang, band, horizon }: { lang: Lang; band: UncertaintyBand; horizon: number }) {
  const s = pagesText(lang);
  const c = s.certainty;
  const month = (m: number | null) => (m === null ? tf(c.beyond, { n: horizon }) : tf(c.monthN, { n: m }));
  const share = Math.min(1, Math.max(0, band.approvalWithinHorizon));
  const percentile = (p: number) => tf(c.percentile, { n: Math.round(p * 100) });
  const { low, mid, high } = band.months;
  const items = [
    { key: "best", label: c.best, value: month(low), strong: false },
    { key: "likely", label: c.likely, value: month(mid), strong: true },
    { key: "worst", label: c.worst, value: month(high), strong: false },
  ];

  return (
    <section aria-labelledby="certainty-title" className="break-inside-avoid">
      <SheetHeading id="certainty-title" tag={s.common.simulation}>
        {c.title}
      </SheetHeading>
      <p className="mt-2 text-sm text-muted-foreground">{tf(c.intro, { runs: band.runs })}</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.key}
            className={cn(
              "rounded-xl p-3",
              it.strong ? "bg-pastel-periwinkle text-deep-periwinkle" : "bg-muted text-foreground",
            )}
          >
            <dt className={cn("text-xs font-semibold", !it.strong && "text-muted-foreground")}>{it.label}</dt>
            <dd className={cn("mt-1 font-extrabold tabular-nums", it.strong ? "text-xl" : "text-lg")}>{it.value}</dd>
          </div>
        ))}
      </dl>
      <MonthRange
        low={low}
        mid={mid}
        high={high}
        horizon={horizon}
        ariaLabel={tf(c.aria, { n: horizon, best: month(low), likely: month(mid), worst: month(high) })}
        axisLabel={c.axis}
        legendRange={`${c.best} – ${c.worst}`}
        legendLikely={c.likely}
      />
      <p className="mt-3 text-sm font-semibold text-foreground">
        {mid === null ? `${tf(c.none, { n: horizon })} ` : null}
        {tf(c.share, { share: pct(share), n: horizon })}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {tf(c.note, { low: percentile(UNCERTAINTY.percentiles.low), high: percentile(UNCERTAINTY.percentiles.high) })}
      </p>
    </section>
  );
}
