"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { tf, type Lang } from "@/lib/i18n";
import {
  allFlags,
  analyzeOffer,
  checklistFlags,
  emptyOfferForm,
  exampleById,
  formFromInput,
  formatRate,
  inputFromForm,
  type Checklist,
  type ChecklistId,
  type Currency,
  type ExampleId,
  type OfferErrors,
  type OfferField,
  type OfferForm,
} from "@/lib/offer";
import { offerStrings } from "@/lib/strings/offer";
import { ChecklistCard } from "./ChecklistCard";
import { ComparisonCard } from "./ComparisonCard";
import { CostBar } from "./CostBar";
import { ExampleButtons } from "./ExampleButtons";
import { IncompleteCard } from "./IncompleteCard";
import { OfferFormCard } from "./OfferFormCard";
import { RedFlagList } from "./RedFlagList";
import { VerdictCard } from "./VerdictCard";

const FIRST_EXAMPLE: ExampleId = "app7";
const DEFAULT_CURRENCY: Currency = "INR";

/**
 * On wide, tall-enough screens the headline result stays in view beside the (longer) form, so
 * people can scroll through the fields and watch the true APR change as they type.
 */
const STICKY_RESULT = "[@media(min-width:64rem)_and_(min-height:52rem)]:sticky [@media(min-width:64rem)_and_(min-height:52rem)]:top-24";

/**
 * The interactive Offer check. Owns the form (raw strings), the self-check and which example is
 * loaded; everything shown is derived on each render from lib/offer.ts. Nothing is stored or sent.
 */
export function OfferChecker({ lang, homeHref }: { lang: Lang; homeHref: string }) {
  const s = offerStrings(lang);
  const [form, setForm] = useState<OfferForm>(() => formFromInput(exampleById(FIRST_EXAMPLE).byCurrency[DEFAULT_CURRENCY], DEFAULT_CURRENCY));
  const [example, setExample] = useState<ExampleId | null>(FIRST_EXAMPLE);
  const [checklist, setChecklist] = useState<Checklist>({});
  const [touched, setTouched] = useState<Partial<Record<OfferField, boolean>>>({});

  const result = analyzeOffer(inputFromForm(form));
  const flags = result.ok ? allFlags(result.analysis, checklist) : checklistFlags(checklist);

  // Inline errors only for fields the person has typed in or left; empty untouched fields are
  // listed in the results panel instead of shouting at someone who has not started yet.
  const visibleErrors: OfferErrors = {};
  if (!result.ok) {
    for (const [field, code] of Object.entries(result.errors) as [OfferField, NonNullable<OfferErrors[OfferField]>][]) {
      if (touched[field] || form[field].trim() !== "") visibleErrors[field] = code;
    }
  }

  const change = (patch: Partial<OfferForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setExample(null);
  };
  const pickExample = (id: ExampleId) => {
    setForm(formFromInput(exampleById(id).byCurrency[form.currency], form.currency));
    setExample(id);
    setTouched({});
  };
  const clear = () => {
    setForm((f) => emptyOfferForm(f));
    setExample(null);
    setTouched({});
  };
  const blur = (field: OfferField) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const toggle = (id: ChecklistId, on: boolean) => setChecklist((c) => ({ ...c, [id]: on }));

  const summary = result.ok
    ? tf(s.liveSummary, { apr: formatRate(result.analysis.apr, form.currency), verdict: s.verdicts[result.analysis.verdict], n: flags.length })
    : s.incomplete;

  return (
    <div className="mt-8 grid gap-6 sm:mt-10">
      <Reveal>
        <ExampleButtons s={s} active={example} onPick={pickExample} />
      </Reveal>

      {/* Row 1: the offer beside its true cost. */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal>
          <OfferFormCard
            s={s}
            form={form}
            errors={visibleErrors}
            example={example}
            onChange={change}
            onBlur={blur}
            onClear={clear}
          />
        </Reveal>

        <section aria-labelledby="offer-results-title" className={`grid gap-6 ${STICKY_RESULT}`}>
          <Reveal delay={0.05}>
            {result.ok ? <VerdictCard a={result.analysis} currency={form.currency} s={s} /> : <IncompleteCard s={s} errors={result.errors} />}
          </Reveal>
          {result.ok && (
            <Reveal delay={0.05}>
              <CostBar a={result.analysis} currency={form.currency} s={s} />
            </Reveal>
          )}
        </section>
      </div>

      {/* Row 2: red flags beside the self-check that adds to them. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Reveal>
          <RedFlagList flags={flags} currency={form.currency} s={s} pending={!result.ok} />
        </Reveal>
        <Reveal delay={0.05}>
          <ChecklistCard s={s} checklist={checklist} onToggle={toggle} />
        </Reveal>
      </div>

      {/* Row 3: what a fair rate would cost. */}
      {result.ok && (
        <Reveal>
          <ComparisonCard a={result.analysis} currency={form.currency} s={s} homeHref={homeHref} />
        </Reveal>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {summary}
      </p>
    </div>
  );
}
