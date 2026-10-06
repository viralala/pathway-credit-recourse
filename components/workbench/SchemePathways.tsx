"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Reveal } from "@/components/motion/Reveal";
import { tf, type Lang } from "@/lib/i18n";
import type { MatchRequest, ProfileFieldKey } from "@/lib/schemes/types";
import { schemeStrings } from "@/lib/strings/schemes";
import type { Applicant } from "@/lib/types";
import { requestMatches } from "./schemes/api";
import { Disclaimer } from "./schemes/Disclaimer";
import { buildProfile, isInMore, MORE_QUESTIONS, PRIMARY_QUESTIONS, type Answers } from "./schemes/fields";
import { failureText, Results, type CheckState } from "./schemes/Results";
import { questionDomId, SchemeForm } from "./schemes/SchemeForm";
import { SectionHeading } from "./SectionHeading";

const ALL_QUESTIONS = [...PRIMARY_QUESTIONS, ...MORE_QUESTIONS];
/** The workbench's income limit (lib/schemes/schema.ts accepts up to this). */
const MAX_MONTHLY_INCOME = 20_00_000;

/**
 * Section 5: government-supported schemes whose published criteria appear relevant. A few optional
 * questions go to the server, which does all the matching; this component only collects the answers
 * and shows the explained result. It is kept apart from the credit assessment on purpose: nothing from
 * the score, the model or the plan is sent, only the monthly income the person typed.
 */
export function SchemePathways({ lang, applicant }: { lang: Lang; applicant: Pick<Applicant, "monthlyIncome"> }) {
  const s = schemeStrings(lang);
  const { user } = useAuth();
  const base = useId();
  const [answers, setAnswers] = useState<Answers>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [saveChecked, setSaveChecked] = useState(false);
  const [state, setState] = useState<CheckState>({ kind: "idle" });
  /** What the shown result was computed for, to tell the person when their answers have moved on. */
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [focusReq, setFocusReq] = useState<{ key: ProfileFieldKey; n: number } | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const { profile, invalid } = useMemo(() => buildProfile(answers, ALL_QUESTIONS), [answers]);
  const profileKey = JSON.stringify(profile);
  const busy = state.kind === "loading";
  const showSave = !!user;

  // A check that is still running when the section goes away must not set state afterwards.
  useEffect(() => () => inFlight.current?.abort(), []);

  function focusField(key: ProfileFieldKey) {
    if (isInMore(key)) setMoreOpen(true);
    setFocusReq((prev) => ({ key, n: (prev?.n ?? 0) + 1 }));
  }

  // Runs after the render that opened "More details", so the question exists by now.
  useEffect(() => {
    if (!focusReq) return;
    const el = document.getElementById(questionDomId(base, focusReq.key));
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.querySelector<HTMLElement>("input, [role='combobox'], [role='radio'], button")?.focus({ preventScroll: true });
  }, [focusReq, base]);

  async function check() {
    if (invalid.length > 0) {
      focusField(invalid[0]);
      return;
    }
    // Only what the person filled in. Nothing from the credit model goes along.
    const body: MatchRequest = {};
    if (Object.keys(profile).length > 0) body.profile = profile;
    const income = applicant.monthlyIncome;
    if (Number.isFinite(income) && income >= 0 && income <= MAX_MONTHLY_INCOME) body.applicant = { monthlyIncome: Math.round(income) };
    const asked = !!user && saveChecked;
    if (asked) body.save = true;

    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setState({ kind: "loading" });

    const result = await requestMatches(body, ctrl.signal);
    // Null: a newer check (or leaving the page) replaced this one; its answer is not wanted.
    if (result === null || inFlight.current !== ctrl) return;
    if (result.ok) {
      setCheckedKey(profileKey);
      setState({ kind: "done", data: result.data, matches: result.data.matches, asked });
    } else {
      setState({ kind: "error", reason: result.reason });
    }
  }

  // One polite announcement per check, for people who cannot see the cards appear.
  const announcement =
    state.kind === "loading"
      ? s.results.loading
      : state.kind === "error"
        ? state.reason === "unavailable"
          ? s.results.unavailable.title
          : failureText(s, state.reason)
        : state.kind === "done"
          ? state.matches.length === 0
            ? s.results.empty.title
            : tf(s.results.found, {
                relevant: state.matches.filter((m) => m.status === "appears_relevant").length,
                more: state.matches.filter((m) => m.status === "needs_more_information").length,
                not: state.matches.filter((m) => m.status === "not_matched").length,
              })
          : "";

  return (
    <section id="schemes" aria-labelledby="schemes-title" className="page-container scroll-mt-24 py-16 sm:py-20">
      <SectionHeading id="schemes-title" n={5} kicker={s.kicker} title={s.title} sub={s.sub} tone="mint" />

      <div className="grid gap-6">
        <Reveal>
          <p className="flex items-start gap-3 rounded-2xl bg-pastel-periwinkle p-4 text-sm font-medium text-deep-periwinkle">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{s.independent}</span>
          </p>
        </Reveal>

        <Reveal>
          <SchemeForm
            s={s}
            base={base}
            answers={answers}
            invalid={invalid}
            onAnswer={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
            moreOpen={moreOpen}
            onMoreOpen={setMoreOpen}
            busy={busy}
            changed={state.kind === "done" && checkedKey !== null && checkedKey !== profileKey}
            showSave={showSave}
            saveChecked={saveChecked}
            onSaveChange={setSaveChecked}
            onSubmit={check}
          />
        </Reveal>

        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <div aria-busy={busy}>
          <Results s={s} lang={lang} state={state} base={base} onAnswerField={focusField} onRetry={check} />
        </div>

        <Reveal>
          <Disclaimer s={s} id={`${base}-disclaimer`} />
        </Reveal>
      </div>
    </section>
  );
}
