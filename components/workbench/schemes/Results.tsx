"use client";

import { BookmarkCheck, CloudOff, Info, SearchX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tf, type Lang } from "@/lib/i18n";
import type { MatchResponse, ProfileFieldKey, SchemeMatch } from "@/lib/schemes/types";
import type { SchemeStrings } from "@/lib/strings/schemes";
import type { MatchFailure } from "./api";
import { Disclosure } from "./Disclosure";
import { MissingFields } from "./MissingFields";
import { SchemeCard } from "./SchemeCard";

export type CheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; data: MatchResponse; matches: SchemeMatch[]; /** Whether the person asked to save this check. */ asked: boolean }
  | { kind: "error"; reason: MatchFailure };

/** What to say for each way a check can fail. */
export function failureText(s: SchemeStrings, reason: MatchFailure): string {
  const r = s.results;
  return reason === "rateLimited" ? r.rateLimited : reason === "network" ? r.network : r.error;
}

function Notice({ icon, title, children }: { icon: ReactNode; title?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-pastel-stone text-deep-stone">
        {icon}
      </span>
      <div className="min-w-0">
        {title && <p className="font-bold text-foreground">{title}</p>}
        <div className="text-sm text-pretty text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div aria-hidden className="grid gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <Skeleton className="mt-4 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-5 h-16 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** The outcome of a check: loading skeletons, a calm message, or the ranked scheme cards. */
export function Results({
  s,
  lang,
  state,
  base,
  onAnswerField,
  onRetry,
}: {
  s: SchemeStrings;
  lang: Lang;
  state: CheckState;
  base: string;
  onAnswerField: (key: ProfileFieldKey) => void;
  onRetry: () => void;
}) {
  const [showNotMatched, setShowNotMatched] = useState(false);
  const r = s.results;

  if (state.kind === "idle") return null;
  if (state.kind === "loading") return <ResultSkeleton />;

  if (state.kind === "error") {
    if (state.reason === "unavailable") {
      return (
        <Notice icon={<CloudOff className="size-5" />} title={r.unavailable.title}>
          <p>{r.unavailable.body}</p>
        </Notice>
      );
    }
    return (
      <Notice icon={<Info className="size-5" />}>
        <p className="font-medium text-foreground">{failureText(s, state.reason)}</p>
        <Button type="button" variant="outline" className="mt-3 h-9 rounded-lg bg-card px-4 font-semibold" onClick={onRetry}>
          {r.retry}
        </Button>
      </Notice>
    );
  }

  const { data, matches, asked } = state;
  if (matches.length === 0) {
    return (
      <Notice icon={<SearchX className="size-5" />} title={r.empty.title}>
        <p>{r.empty.body}</p>
      </Notice>
    );
  }

  // The server already ranked the matches; keep its order inside each group.
  const open = matches.filter((m) => m.status !== "not_matched");
  const notMatched = matches.filter((m) => m.status === "not_matched");
  const renderCards = (list: SchemeMatch[]) => (
    <Stagger>
      <ul className="grid gap-4">
        {list.map((m) => (
          <li key={m.scheme.id ?? m.scheme.slug ?? m.scheme.name}>
            <StaggerItem>
              <SchemeCard s={s} lang={lang} match={m} onAnswerField={onAnswerField} />
            </StaggerItem>
          </li>
        ))}
      </ul>
    </Stagger>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight">{r.heading}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {matches.length === 1 ? r.countOne : tf(r.countMany, { n: matches.length })} {s.card.englishNote}
          </p>
        </div>
        {asked && (
          <p
            className={
              data.saved
                ? "inline-flex items-center gap-2 rounded-lg bg-success-soft px-3 py-1.5 text-sm font-semibold text-success-foreground"
                : "text-sm font-medium text-muted-foreground"
            }
          >
            {data.saved ? (
              <>
                <BookmarkCheck aria-hidden className="size-4" />
                {r.saved}
              </>
            ) : (
              r.notSaved
            )}
          </p>
        )}
      </div>

      {data.missingFields.length > 0 && (
        <div className="rounded-2xl bg-pastel-sky p-5 text-deep-sky">
          <p className="text-sm font-bold">{r.missingTop}</p>
          <div className="mt-3 sm:max-w-xl">
            <MissingFields s={s} fields={data.missingFields} onAnswerField={onAnswerField} />
          </div>
        </div>
      )}

      {open.length > 0 ? (
        <div className="grid gap-4">
          <div>
            <h4 className="text-lg font-extrabold tracking-tight">{r.openGroup}</h4>
            <p className="mt-0.5 text-sm text-muted-foreground">{r.openGroupSub}</p>
          </div>
          {renderCards(open)}
        </div>
      ) : (
        <Notice icon={<SearchX className="size-5" />}>
          <p className="font-medium text-foreground">{r.noneOpen}</p>
        </Notice>
      )}

      {notMatched.length > 0 && (
        <Disclosure
          id={`${base}-notmatched`}
          open={showNotMatched}
          onOpenChange={setShowNotMatched}
          heading="h4"
          label={`${r.notMatchedGroup} (${notMatched.length})`}
          hint={r.notMatchedHint}
          className="rounded-2xl bg-muted/70 p-5 ring-1 ring-foreground/5"
          buttonClassName="py-1 text-base"
        >
          <div className="mt-4">{renderCards(notMatched)}</div>
        </Disclosure>
      )}
    </div>
  );
}
