"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { withLang } from "@/components/site/nav";
import { useLang } from "@/components/site/use-lang";
import type { Lang } from "@/lib/i18n";
import { connectStrings } from "@/lib/strings/connect";

/**
 * Where the Account Aggregator sends the approval window after the person approves or declines.
 * The Pathway tab polls the consent status itself, so this page only tells them to close the window.
 */
export function ConsentDoneContent({ lang }: { lang: Lang }) {
  const s = connectStrings(lang).done;
  const [blocked, setBlocked] = useState(false);

  function close() {
    window.close();
    // Browsers only close windows a script opened; if this one is still here, say so.
    setTimeout(() => {
      if (!window.closed) setBlocked(true);
    }, 300);
  }

  return (
    <div lang={lang} className="page-container py-16 sm:py-24">
      <div className="mx-auto max-w-xl rounded-2xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-xl bg-success-soft text-success-foreground">
          <CircleCheck className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl">{s.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">{s.declined}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" size="lg" className="rounded-xl" onClick={close}>
            {s.close}
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link href={withLang("/", lang)}>{s.home}</Link>
          </Button>
        </div>
        {blocked && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            {s.closeBlocked}
          </p>
        )}
      </div>
    </div>
  );
}

/** Localized from `?lang=`. Mount inside <Suspense fallback={<ConsentDoneContent lang="en" />}>. */
export function LocalizedConsentDone() {
  return <ConsentDoneContent lang={useLang()} />;
}
