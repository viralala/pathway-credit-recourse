import type { SchemeStrings } from "@/lib/strings/schemes";
import { KICKER } from "../SectionHeading";
import { cn } from "@/lib/utils";

/** Always shown, whatever the result: this is information, not advice, a decision or an offer. */
export function Disclaimer({ s, id }: { s: SchemeStrings; id: string }) {
  const d = s.disclaimer;
  return (
    <aside aria-labelledby={id} className="rounded-2xl bg-muted/70 p-6 ring-1 ring-foreground/5">
      <h3 id={id} className={cn(KICKER, "text-muted-foreground")}>
        {d.title}
      </h3>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm text-pretty text-muted-foreground marker:text-muted-foreground/60">
        <li>{d.information}</li>
        <li>{d.match}</li>
        <li>{d.decides}</li>
        <li>{d.changes}</li>
        <li>{d.affiliation}</li>
      </ul>
    </aside>
  );
}
