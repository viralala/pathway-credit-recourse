"use client";

import { CircleCheck, Hourglass } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { tf } from "@/lib/i18n";
import { flagCounts, type Currency, type RedFlag, type Severity } from "@/lib/offer";
import { flagCopy, type OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { CARD, SEVERITY_STYLE } from "./styles";

const SEVERITIES: Severity[] = ["danger", "warning", "info"];

/**
 * Red flags from the numbers and the self-check, most serious first, each with icon and label text.
 * `pending` means the offer is not complete yet, so the numbers have not been checked.
 */
export function RedFlagList({
  flags,
  currency,
  s,
  pending = false,
}: {
  flags: RedFlag[];
  currency: Currency;
  s: OfferStrings;
  pending?: boolean;
}) {
  const reduce = useReducedMotion();
  const n = flagCounts(flags);

  return (
    <Card className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4">
        <h3 className="text-base font-semibold">{s.flagsTitle}</h3>
        {flags.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {SEVERITIES.filter((k) => n[k] > 0)
              .map((k) => tf(s.flagCount, { label: s.severity[k], n: n[k] }))
              .join(" · ")}
          </p>
        )}
      </div>
      <CardContent className="grid gap-2">
        {pending && (
          <p className="flex items-start gap-2 rounded-xl bg-muted/70 p-3 text-sm text-muted-foreground">
            <Hourglass aria-hidden className="mt-0.5 size-4 shrink-0" />
            {s.flagsPending}
          </p>
        )}
        {flags.length === 0 ? (
          !pending && (
            <p className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm text-success-foreground">
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              {s.flagsNone}
            </p>
          )
        ) : (
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {flags.map((f) => {
                const st = SEVERITY_STYLE[f.severity];
                const Icon = st.icon;
                const copy = flagCopy(s, f, currency);
                return (
                  <motion.li
                    key={f.id}
                    layout={reduce ? false : "position"}
                    initial={reduce ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("flex gap-3 rounded-xl p-3", st.row)}
                  >
                    <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", st.iconClass)} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", st.badge)}>{s.severity[f.severity]}</span>
                        <span className="text-sm font-semibold">{copy.title}</span>
                      </p>
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">{copy.body}</p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
