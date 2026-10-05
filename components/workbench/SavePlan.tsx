"use client";

import { Bookmark, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { withLang } from "@/components/site/nav";
import { useSession } from "@/components/site/use-session";
import { Button } from "@/components/ui/button";
import { tf, type Lang, type UIStrings } from "@/lib/i18n";
import type { Applicant } from "@/lib/types";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; score?: number } | { kind: "error"; message: string };

/**
 * Save the current profile as a plan, or, when the page was opened from a saved plan, record
 * today's numbers against it. Renders nothing when accounts are switched off for this deployment.
 */
export function SavePlan({
  ui,
  lang,
  applicant,
  name,
  planId,
  returnTo,
}: {
  ui: UIStrings;
  lang: Lang;
  applicant: Applicant;
  name: string;
  /** Set when this page was opened from "My plans" to log progress. */
  planId: string | null;
  /** This page's address, so sign-in can come back here. */
  returnTo: string;
}) {
  const session = useSession();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const s = ui.save;
  if (!session.enabled || !session.ready) return null;

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch(planId ? `/api/plans/${planId}/checkins` : "/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(planId ? { applicant } : { name, applicant, lang }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; score?: number };
      if (res.ok) return setStatus({ kind: "saved", score: typeof j.score === "number" ? j.score : undefined });
      const message = j.error === "limit_reached" ? s.errors.limit : j.error === "unauthorized" ? s.errors.signedOut : s.errors.generic;
      setStatus({ kind: "error", message });
    } catch {
      setStatus({ kind: "error", message: s.errors.generic });
    }
  }

  return (
    <section aria-labelledby="save-title" className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-3">
        <Bookmark aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 id="save-title" className="font-bold text-secondary-foreground">
            {s.title}
          </h2>
          <p className="mt-1 text-sm text-secondary-foreground/85">
            {!session.signedIn ? s.signedOut : planId ? s.checkin : s.newPlan}
          </p>
          <p role="status" className="mt-1 text-sm font-semibold text-secondary-foreground empty:hidden">
            {status.kind === "error" ? status.message : status.kind === "saved" ? (status.score !== undefined ? tf(s.savedCheckin, { score: status.score }) : s.saved) : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {!session.signedIn ? (
          <Button asChild className="h-10 px-4">
            <a href={withLang(`/signin?next=${encodeURIComponent(returnTo)}`, lang)}>{s.signIn}</a>
          </Button>
        ) : status.kind === "saved" ? (
          <Button asChild variant="outline" className="h-10 bg-card px-4">
            <Link href={withLang("/account", lang)}>
              <Check aria-hidden />
              {s.open}
            </Link>
          </Button>
        ) : (
          <Button type="button" className="h-10 px-4" onClick={save} disabled={status.kind === "saving"} aria-busy={status.kind === "saving"}>
            {status.kind === "saving" ? s.saving : planId ? s.saveCheckin : s.save}
          </Button>
        )}
      </div>
    </section>
  );
}
