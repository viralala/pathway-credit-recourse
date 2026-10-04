import { cn } from "@/lib/utils";

/** Label / value list used for every "assumptions" panel, so they all read the same. */
export function RowList({
  rows,
  lang,
  className,
}: {
  rows: { label: string; value: string }[];
  /** Set when the rows are in a different language from the page (e.g. English-only config text). */
  lang?: string;
  className?: string;
}) {
  return (
    <dl lang={lang} className={cn("grid gap-3 text-sm", className)}>
      {rows.map((x) => (
        <div key={x.label} className="grid gap-0.5">
          <dt className="font-semibold text-foreground">{x.label}</dt>
          <dd className="text-muted-foreground">{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}
