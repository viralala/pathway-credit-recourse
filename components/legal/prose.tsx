import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Typography for long-form legal text, built from Tailwind utilities only (no typography plugin).
 * Every element here is presentational, so a re-skin is a change to these classes.
 */

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-36 border-t border-border pt-8 first:border-t-0 first:pt-0 lg:scroll-mt-24 print:break-inside-avoid-page"
    >
      <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-semibold text-foreground sm:text-lg">{children}</h3>;
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("max-w-[70ch] text-[15px] leading-7 text-foreground/85 wrap-break-word print:text-black", className)}>{children}</p>;
}

export function List({ children, ordered = false }: { children: ReactNode; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "max-w-[70ch] space-y-2 pl-5 text-[15px] leading-7 text-foreground/85 wrap-break-word marker:text-muted-foreground print:text-black",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {children}
    </Tag>
  );
}

export function Item({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

const linkClass =
  "font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm wrap-anywhere";

/** Link to another page or section of this site. */
export function InternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  );
}

/** Link to another website. Opens in the same tab; the visually hidden note tells screen-reader users it leaves the site. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noopener noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (external website)</span>
    </a>
  );
}

const CALLOUT_TONE = {
  info: "bg-pastel-sky/70 text-deep-sky ring-deep-sky/15",
  important: "bg-warning-soft text-warning-foreground ring-warning/20",
  calm: "bg-pastel-mint/70 text-deep-mint ring-deep-mint/15",
} as const;

/** Highlighted block for the points a reader must not miss. The heading carries the meaning, not the colour. */
export function Callout({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: keyof typeof CALLOUT_TONE;
  children: ReactNode;
}) {
  return (
    <div
      role="note"
      aria-label={title}
      className={cn(
        "max-w-[70ch] rounded-2xl p-5 ring-1 sm:p-6 print:bg-transparent print:p-0 print:text-black print:ring-0",
        CALLOUT_TONE[tone],
      )}
    >
      <p className="text-sm font-bold uppercase tracking-[0.12em]">{title}</p>
      <div className="mt-2 space-y-3 text-[15px] leading-7 [&_a]:text-current [&_li]:marker:text-current [&_ol]:text-current [&_p]:text-current [&_ul]:text-current">
        {children}
      </div>
    </div>
  );
}

/** Inline code-like label, used for cookie and storage names. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground wrap-anywhere print:bg-transparent">
      {children}
    </code>
  );
}
