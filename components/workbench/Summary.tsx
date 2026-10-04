"use client";

import { MessageSquareText, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import type { UIStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { KICKER } from "./SectionHeading";

/** Plain-language summary with the optional AI rewrite. */
export function Summary({
  ui,
  text,
  source,
  rewriting,
  onRewrite,
}: {
  ui: UIStrings;
  text: string;
  /** "ai" once the server returned an AI rewrite for the current summary. */
  source: "ai" | "template";
  rewriting: boolean;
  onRewrite: () => void;
}) {
  return (
    <Reveal>
      <section
        aria-labelledby="summary-title"
        className="grid gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"
      >
        <div className="flex gap-4">
          <span aria-hidden className="hidden size-11 shrink-0 place-items-center rounded-xl bg-pastel-butter text-deep-butter sm:grid">
            <MessageSquareText className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="summary-title" className={cn(KICKER, "text-muted-foreground")}>
                {ui.explanation}
              </h2>
              {source === "ai" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-lavender px-2 py-0.5 text-[11px] font-semibold text-deep-lavender">
                  <Sparkles aria-hidden className="size-3" />
                  {ui.aiBadge}
                </span>
              )}
            </div>
            <p className="mt-2 text-lg leading-relaxed text-pretty text-foreground" data-testid="summary">
              {text}
            </p>
            <span role="status" className="sr-only">
              {source === "ai" ? ui.aiBadge : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1.5 lg:max-w-[17rem]">
          <Button type="button" variant="outline" size="lg" onClick={onRewrite} disabled={rewriting} aria-busy={rewriting} className="rounded-xl px-4">
            <Sparkles aria-hidden />
            {rewriting ? ui.rewriting : ui.rewrite}
          </Button>
          <p className="text-xs text-muted-foreground">{ui.rewriteNote}</p>
        </div>
      </section>
    </Reveal>
  );
}
