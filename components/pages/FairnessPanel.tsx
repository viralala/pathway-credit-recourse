import { FairnessBars, type FairnessDatum } from "@/components/FairnessBars";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tf, type Lang } from "@/lib/i18n";
import { gapText, groupLabel, pagesText } from "@/lib/strings/pages";

export interface FairnessGroup {
  group: string;
  n: number;
  adjustedEffort: number | null;
  noPlanRate: number;
  medianMonths: number | null;
}

/** Word joiners around the en dash so a range like "18–34" never wraps in the middle. */
const keepRangeTogether = (label: string) => label.replace(/–/g, "\u2060–\u2060");

/** One audit dimension (age or income): gap badge, bar chart and the same numbers as a table. */
export function FairnessPanel({
  id,
  lang,
  title,
  groups,
  ratio,
}: {
  id: string;
  lang: Lang;
  title: string;
  groups: FairnessGroup[];
  ratio: number;
}) {
  const s = pagesText(lang);
  const fs = s.fairness;
  const rows = groups.map((g) => ({ ...g, label: groupLabel(lang, g.group) }));
  const data: FairnessDatum[] = rows
    .filter((g) => g.adjustedEffort !== null)
    .map((g) => ({ group: g.label, effort: g.adjustedEffort as number, n: g.n }));
  const most = data.reduce((a, b) => (b.effort > a.effort ? b : a), data[0]);
  const least = data.reduce((a, b) => (b.effort < a.effort ? b : a), data[0]);
  const ariaLabel = tf(fs.chart.aria, {
    title,
    list: data.map((d) => `${d.group} ${d.effort.toFixed(2)}`).join(", "),
    most: most?.group ?? s.common.na,
    least: least?.group ?? s.common.na,
  });
  const headingId = `${id}-title`;

  return (
    <section aria-labelledby={headingId} className="h-full rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        <span className="rounded-md bg-pastel-peach px-3 py-1 text-xs font-bold text-deep-peach">
          {tf(fs.panels.gap, { v: gapText(ratio) })}
        </span>
      </div>
      {data.length > 0 ? (
        <div className="mt-4">
          <FairnessBars
            data={data}
            ariaLabel={ariaLabel}
            mostLabel={fs.chart.most}
            leastLabel={fs.chart.least}
            seriesName={fs.chart.seriesName}
            valueTemplate={fs.chart.value}
          />
        </div>
      ) : null}
      <Table className="mt-4 text-xs sm:text-sm">
        <TableCaption className="sr-only">
          {`${title}: ${fs.panels.caption}`}
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-1 whitespace-normal sm:px-2 text-muted-foreground">{fs.table.group}</TableHead>
            <TableHead className="px-1 whitespace-normal sm:px-2 text-right text-muted-foreground">{fs.table.rejected}</TableHead>
            <TableHead className="px-1 whitespace-normal sm:px-2 text-right text-muted-foreground">{fs.table.effort}</TableHead>
            <TableHead className="px-1 whitespace-normal sm:px-2 text-right text-muted-foreground">{fs.table.noPlan}</TableHead>
            <TableHead className="px-1 whitespace-normal sm:px-2 text-right text-muted-foreground">{fs.table.months}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((g) => (
            <TableRow key={g.group}>
              <TableCell className="px-1 font-semibold whitespace-normal sm:px-2">
                {keepRangeTogether(g.label)}
              </TableCell>
              <TableCell className="px-1 text-right tabular-nums sm:px-2">{g.n}</TableCell>
              <TableCell className="px-1 text-right tabular-nums sm:px-2">{g.adjustedEffort?.toFixed(2) ?? s.common.na}</TableCell>
              <TableCell className="px-1 text-right tabular-nums sm:px-2">{(g.noPlanRate * 100).toFixed(0)}%</TableCell>
              <TableCell className="px-1 text-right tabular-nums sm:px-2">{g.medianMonths ?? s.common.na}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
