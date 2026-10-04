import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LegalColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Marks the cell that names the row (a row header in the table, the card title on phones). */
  rowHeader?: boolean;
  className?: string;
}

/**
 * Accessible data table for legal pages.
 *
 * From the `sm` breakpoint (and in print) it is a real <table> with a caption, column headers and
 * row headers. On phones the same data is shown as one card per row with a definition list, which
 * reads better at 360px than a squeezed table. Only one of the two is ever displayed, so assistive
 * technology meets the content once.
 */
export function LegalTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: LegalColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  const titleColumn = columns.find((c) => c.rowHeader) ?? columns[0];
  const detailColumns = columns.filter((c) => c !== titleColumn);
  const captionId = `table-${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  return (
    <div>
      {/* Phones: cards */}
      <div className="sm:hidden print:hidden">
        <p id={captionId} className="text-sm font-semibold text-foreground">
          {caption}
        </p>
        <ul aria-labelledby={captionId} className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={rowKey(row)} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="font-semibold text-foreground wrap-anywhere">{titleColumn.cell(row)}</div>
              <dl className="mt-3 space-y-2.5 text-sm">
                {detailColumns.map((c) => (
                  <div key={c.header}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{c.header}</dt>
                    <dd className="mt-0.5 leading-6 text-foreground/85 wrap-anywhere">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet, desktop and print: table */}
      <div className="hidden max-w-full overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10 sm:block print:block print:overflow-visible print:ring-0">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="px-5 pt-4 pb-2 text-left text-sm font-semibold text-foreground print:px-0">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-muted/60 print:bg-transparent">
              {columns.map((c) => (
                <th
                  key={c.header}
                  scope="col"
                  className="px-5 py-2.5 align-bottom text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground print:px-2"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-b-0">
                {columns.map((c) => {
                  const Cell = c.rowHeader ? "th" : "td";
                  return (
                    <Cell
                      key={c.header}
                      scope={c.rowHeader ? "row" : undefined}
                      className={cn(
                        "px-5 py-3 align-top leading-6 font-normal text-foreground/85 wrap-anywhere print:px-2 print:text-black",
                        c.rowHeader && "font-semibold text-foreground",
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
