"use client";

import { ArrowUpRight, GitBranch, Info } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import { primaryNav, withLang } from "@/components/site/nav";
import { useLang } from "@/components/site/use-lang";
import type { Lang } from "@/lib/i18n";
import { REPO_URL } from "@/lib/site";
import { shell } from "@/lib/strings/shell";

/** Reads `?lang=` from the URL. Mount inside <Suspense> with <FooterContent lang="en" /> as the fallback. */
export function SiteFooter() {
  return <FooterContent lang={useLang()} />;
}

const linkClass =
  "rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

function Group({
  id,
  title,
  note,
  after,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 id={id} className="text-xs font-bold tracking-wide text-foreground uppercase">
        {title}
      </h2>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <ul aria-labelledby={id} className="mt-3 space-y-2.5">
        {children}
      </ul>
      {after}
    </div>
  );
}

export function FooterContent({ lang }: { lang: Lang }) {
  const s = shell(lang);
  const f = s.footer;
  return (
    <footer lang={lang} className="border-t border-border bg-card/60">
      <div className="page-container pt-12 pb-24 sm:pb-20 print:py-4">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link
              href={withLang("/", lang)}
              aria-label={s.homeAria}
              className="no-print -m-1 inline-flex rounded-xl p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Logo />
            </Link>
            <p className="no-print mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{f.tagline}</p>
            <div className="mt-5 flex max-w-lg gap-3 rounded-2xl bg-muted/70 p-4 ring-1 ring-foreground/5">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-deep-periwinkle" />
              <p className="text-[13px] leading-relaxed text-foreground/80">
                <strong className="font-bold text-foreground">{f.disclaimerTitle}:</strong> {f.disclaimer}
              </p>
            </div>
          </div>

          <nav aria-label={f.footerNav} className="no-print grid gap-8 sm:grid-cols-3 lg:col-span-7">
            <Group id="footer-product" title={f.product}>
              {primaryNav(lang).map((item) => (
                <li key={item.key}>
                  <Link href={withLang(item.href, lang)} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={withLang("/partners", lang)} className={linkClass}>
                  {s.nav.partners}
                </Link>
              </li>
            </Group>

            <Group id="footer-legal" title={f.legal} note={f.legalNote || undefined}>
              <li>
                <Link href={withLang("/terms", lang)} className={linkClass} hrefLang="en">
                  {f.terms}
                </Link>
              </li>
              <li>
                <Link href={withLang("/privacy", lang)} className={linkClass} hrefLang="en">
                  {f.privacy}
                </Link>
              </li>
              <li>
                <Link href={withLang("/licenses", lang)} className={linkClass} hrefLang="en">
                  {f.licenses}
                </Link>
              </li>
            </Group>

            <Group
              id="footer-source"
              title={f.openSource}
              after={<p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">{f.sourceBody}</p>}
            >
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-1.5 font-semibold text-foreground`}
                >
                  <GitBranch aria-hidden="true" className="size-3.5" />
                  {f.source}
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  <span className="sr-only"> {f.newTab}</span>
                </a>
              </li>
            </Group>
          </nav>
        </div>

        <p className="no-print mt-10 border-t border-border pt-6 text-xs text-muted-foreground">{f.copyright}</p>
      </div>
    </footer>
  );
}
