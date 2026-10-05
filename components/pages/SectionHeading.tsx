import type { ReactNode } from "react";
import { TRACKED } from "@/components/pages/typography";
import { cn } from "@/lib/utils";

/** Heading block for a page section: small eyebrow, the h2, an optional tag pill and intro copy. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  tag,
  children,
  className,
}: {
  /** Id of the h2, for aria-labelledby on the section. */
  id: string;
  eyebrow?: string;
  title: string;
  tag?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <p className={cn("text-xs font-bold text-deep-stone", TRACKED)}>{eyebrow}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={id} className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {tag ? (
          <span className="rounded-md bg-pastel-butter px-2.5 py-0.5 text-xs font-semibold text-deep-butter">{tag}</span>
        ) : null}
      </div>
      {children ? <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div> : null}
    </div>
  );
}

/** Small uppercase heading used inside the printable report sheet. */
export function SheetHeading({ id, children, tag }: { id?: string; children: ReactNode; tag?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 id={id} className={cn("text-xs font-bold text-deep-stone", TRACKED)}>
        {children}
      </h2>
      {tag ? (
        <span className="rounded-md bg-pastel-butter px-2 py-0.5 text-[0.7rem] font-semibold text-deep-butter">{tag}</span>
      ) : null}
    </div>
  );
}
