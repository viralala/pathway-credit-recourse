import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import type { Lang } from "@/lib/i18n";
import { LEGAL_UPDATED } from "./data";
import { LegalArt } from "./LegalArt";
import { hrefWithLang, LEGAL_PAGES, type LegalHref } from "./links";
import { TableOfContents, type TocItem } from "./TableOfContents";

/**
 * Shared shell for /terms, /privacy and /licenses: breadcrumbs, a header with the "last updated"
 * date, an on-page table of contents, and links to the other legal pages. Legal text is English
 * only (lang="en"), but links back into the app keep the visitor's ?lang= choice.
 */
export function LegalPage({
  current,
  title,
  summary,
  toc,
  lang,
  children,
}: {
  current: LegalHref;
  title: string;
  summary: string;
  toc: TocItem[];
  lang: Lang;
  children: ReactNode;
}) {
  const others = LEGAL_PAGES.filter((p) => p.href !== current);
  return (
    <div lang="en" className="page-container py-8 sm:py-12 print:py-0">
      <Breadcrumbs items={[{ label: title }]} homeHref={hrefWithLang("/", lang)} homeLabel="Home" />

      <header className="relative mt-6 overflow-hidden rounded-2xl bg-pastel-periwinkle/60 p-6 ring-1 ring-foreground/10 sm:p-10 print:mt-0 print:overflow-visible print:bg-transparent print:p-0 print:ring-0">
        <LegalArt className="pointer-events-none absolute -right-8 -bottom-10 hidden h-52 w-52 opacity-90 lg:block print:hidden" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-deep-periwinkle print:text-black">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-3 text-[15px] leading-7 text-foreground/80 print:text-black">{summary}</p>
          <p className="mt-5 inline-flex flex-wrap items-baseline gap-x-1.5 rounded-md bg-card/80 px-3 py-1 text-sm text-muted-foreground ring-1 ring-foreground/10 print:px-0 print:ring-0">
            Last updated
            <time dateTime={LEGAL_UPDATED.iso} className="font-semibold text-foreground">
              {LEGAL_UPDATED.label}
            </time>
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <div className="no-print lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
          <TableOfContents items={toc} />
        </div>

        <article className="min-w-0 space-y-10">
          {children}

          <nav aria-label="Other legal pages" className="no-print rounded-2xl bg-muted/60 p-5 ring-1 ring-foreground/10 sm:p-6">
            <p className="text-sm font-semibold text-foreground">Also read</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((p) => (
                <li key={p.href}>
                  <Link
                    href={hrefWithLang(p.href, lang)}
                    className="inline-flex min-h-10 items-center rounded-md bg-card px-4 text-sm font-medium text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={hrefWithLang("/", lang)}
                  className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Back to Pathway
                </Link>
              </li>
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
}
