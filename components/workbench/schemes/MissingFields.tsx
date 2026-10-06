import { tf } from "@/lib/i18n";
import type { ProfileFieldKey } from "@/lib/schemes/types";
import type { SchemeStrings } from "@/lib/strings/schemes";
import { isAsked } from "./fields";

/**
 * Fields whose answers could change a result. Each one that has a question on the form is a button that
 * scrolls to that question and focuses it; a field with no question here is shown as plain text.
 */
export function MissingFields({
  s,
  fields,
  onAnswerField,
}: {
  s: SchemeStrings;
  fields: ProfileFieldKey[];
  onAnswerField: (key: ProfileFieldKey) => void;
}) {
  const unique = [...new Set(fields)];
  return (
    <ul className="grid gap-2">
      {unique.map((key) => {
        const label = s.fields[key]?.label ?? key;
        return (
          <li key={key}>
            {isAsked(key) ? (
              <button
                type="button"
                onClick={() => onAnswerField(key)}
                aria-label={tf(s.card.goTo, { field: label })}
                className="w-full rounded-lg bg-card px-3 py-2 text-left text-sm font-semibold text-foreground ring-1 ring-foreground/10 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                {label}
              </button>
            ) : (
              <span className="block rounded-lg bg-card/60 px-3 py-2 text-sm font-medium text-foreground">{label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
