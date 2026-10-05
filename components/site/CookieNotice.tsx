"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dismissNotice, useNoticeSeen } from "@/lib/consent";
import { shell } from "@/lib/strings/shell";
import { useLang } from "./use-lang";
import { withLang } from "./nav";

/**
 * A notice, not a choice: Pathway stores nothing optional, so there is nothing to opt in to.
 * Renders nothing on the server and until it is known whether the notice was already dismissed.
 */
export function CookieNotice() {
  const lang = useLang();
  const { ready, seen } = useNoticeSeen();
  if (!ready || seen) return null;
  const s = shell(lang).notice;
  return (
    <section
      aria-label={s.regionLabel}
      lang={lang}
      className="no-print fixed inset-x-4 bottom-4 z-50 max-w-md rounded-2xl bg-card p-4 shadow-[0_18px_40px_-24px_rgb(42_40_56/0.45)] ring-1 ring-foreground/10 sm:inset-x-auto sm:left-4"
    >
      <p className="text-sm leading-relaxed text-foreground">{s.body}</p>
      <div className="mt-3 flex items-center gap-4">
        <Button size="sm" className="h-8 rounded-lg px-4" onClick={() => dismissNotice()}>
          {s.ok}
        </Button>
        <Link href={withLang("/privacy#cookies", lang)} className="text-sm font-semibold text-primary underline underline-offset-4">
          {s.privacy}
        </Link>
      </div>
    </section>
  );
}
