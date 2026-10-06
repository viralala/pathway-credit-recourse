import { CircleCheck, CircleHelp, CircleX, type LucideIcon } from "lucide-react";
import { tf } from "@/lib/i18n";
import type { CriterionResult, Outcome } from "@/lib/schemes/types";
import type { SchemeStrings } from "@/lib/strings/schemes";
import { cn } from "@/lib/utils";
import { answerText } from "./format";

/** Each outcome has its own icon and word as well as a colour, so it never relies on colour alone. */
const OUTCOME: Record<Outcome, { icon: LucideIcon; tone: string }> = {
  pass: { icon: CircleCheck, tone: "bg-success-soft text-success-foreground" },
  fail: { icon: CircleX, tone: "bg-danger-soft text-danger-foreground" },
  unknown: { icon: CircleHelp, tone: "bg-muted text-muted-foreground" },
};

function CriterionRow({ s, c }: { s: SchemeStrings; c: CriterionResult }) {
  const { icon: Icon, tone } = OUTCOME[c.outcome] ?? OUTCOME.unknown;
  const outcome = s.card.outcome[c.outcome] ?? s.card.outcome.unknown;
  return (
    <li className="flex items-start gap-3 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", tone)}>
        <Icon aria-hidden className="size-3.5" />
        {outcome}
      </span>
      <div className="min-w-0 text-sm">
        {/* The criterion text is the scheme's own English wording. */}
        <p lang="en" className="font-medium text-pretty text-foreground">
          {c.label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {c.outcome === "unknown" ? s.card.noAnswer : tf(s.card.yourAnswer, { value: answerText(s, c.field, c.actual) })}
          {c.sourceRef && (
            <>
              {" · "}
              <span lang="en">{tf(s.card.source, { ref: c.sourceRef })}</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * The rule evaluation, criterion by criterion: required ones first, then the scheme's priorities,
 * which are labelled as not being conditions.
 */
export function CriterionList({ s, criteria }: { s: SchemeStrings; criteria: CriterionResult[] }) {
  const required = criteria.filter((c) => c.importance !== "preferred");
  const preferred = criteria.filter((c) => c.importance === "preferred");
  if (criteria.length === 0) return null;

  return (
    <div className="grid gap-4">
      <p className="text-sm font-bold text-foreground">{s.card.criteriaHeading}</p>
      {required.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted-foreground">{s.card.requiredHeading}</p>
          <ul className="grid gap-2">
            {required.map((c) => (
              <CriterionRow key={c.id} s={s} c={c} />
            ))}
          </ul>
        </div>
      )}
      {preferred.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-3">
          <p className="text-xs font-bold text-muted-foreground">{s.card.preferredHeading}</p>
          <p className="mt-0.5 mb-2 text-xs text-muted-foreground">{s.card.preferredNote}</p>
          <ul className="grid gap-2">
            {preferred.map((c) => (
              <CriterionRow key={c.id} s={s} c={c} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
