"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGS, type Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { cn } from "@/lib/utils";
import { switchLangHref } from "./nav";

/**
 * EN / हिं / मरा segmented switch. Each option is a link to the same page with `?lang=` changed
 * (all other query params kept), so it works without JavaScript and can be shared.
 */
export function LanguageSwitcher({
  lang,
  search,
  className,
  onNavigate,
}: {
  lang: Lang;
  /** Current query string without the leading "?". */
  search: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div
      role="group"
      aria-label={shell(lang).language}
      className={cn("inline-flex items-center rounded-lg bg-muted p-0.5 ring-1 ring-foreground/5", className)}
    >
      {LANGS.map((l) => {
        const current = l.id === lang;
        return (
          <Link
            key={l.id}
            href={switchLangHref(pathname, search, l.id)}
            lang={l.id}
            hrefLang={l.id}
            aria-current={current ? "true" : undefined}
            title={l.label}
            onClick={onNavigate}
            className={cn(
              "inline-flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-[13px] font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              current
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(42_40_56/0.08)] ring-1 ring-foreground/10"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
            )}
          >
            {l.native}
            <span className="sr-only"> ({l.label})</span>
          </Link>
        );
      })}
    </div>
  );
}
