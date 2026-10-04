"use client";

import type { Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { useLang } from "./use-lang";

/** "Skip to content" link, invisible until focused. Targets <main id="main" tabIndex={-1}>. */
export function SkipLinkView({ lang }: { lang: Lang }) {
  return (
    <a
      href="#main"
      lang={lang}
      className="no-print fixed top-3 left-3 z-60 -translate-y-[calc(100%_+_1.5rem)] rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground opacity-0 shadow-[0_8px_24px_-12px_rgb(42_40_56/0.35)] ring-2 ring-ring outline-none focus:translate-y-0 focus:opacity-100"
    >
      {shell(lang).skipToContent}
    </a>
  );
}

/** Localized from `?lang=`. Mount inside <Suspense fallback={<SkipLinkView lang="en" />}>. */
export function SkipLink() {
  return <SkipLinkView lang={useLang()} />;
}
