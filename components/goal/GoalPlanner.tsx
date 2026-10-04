"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { normalizeGoal, planGoal, type Goal } from "@/lib/goal";
import { pct, tf, type Lang } from "@/lib/i18n";
import { PRICING } from "@/lib/pricing";
import { SAMPLES } from "@/lib/samples";
import { aprText, goalStrings } from "@/lib/strings/goal";
import type { Applicant, FeatureKey } from "@/lib/types";
import { paramsFor } from "@/lib/url";
import { AffordabilityCard } from "./AffordabilityCard";
import { GoalInputs } from "./GoalInputs";
import { GoalTimelineCard } from "./GoalTimelineCard";
import { MilestoneChecklist } from "./MilestoneChecklist";
import { PlanSteps } from "./PlanSteps";
import { ScoreGoalCard } from "./ScoreGoalCard";
import { TodayCard } from "./TodayCard";

/**
 * Interactive goal planner: inputs on the left, the plan worked backwards from the goal on the right.
 * All maths lives in lib/goal.ts; this component only holds state and keeps the URL shareable.
 */
export function GoalPlanner({
  initialApplicant,
  initialName,
  initialSampleId,
  initialGoal,
  lang,
}: {
  initialApplicant: Applicant;
  initialName: string;
  initialSampleId: string | null;
  initialGoal: Goal;
  lang: Lang;
}) {
  const s = goalStrings(lang);
  const [applicant, setApplicant] = useState(initialApplicant);
  const [name, setName] = useState(initialName);
  const [sampleId, setSampleId] = useState(initialSampleId);
  const [goal, setGoal] = useState(initialGoal);

  // Dragging a slider re-plans on every step; deferring keeps the inputs responsive.
  const deferredApplicant = useDeferredValue(applicant);
  const deferredGoal = useDeferredValue(goal);
  const gp = useMemo(() => planGoal(deferredApplicant, deferredGoal), [deferredApplicant, deferredGoal]);

  const sync = (next: { applicant: Applicant; sampleId: string | null; name: string; goal: Goal }) => {
    const q = paramsFor(next.applicant, {
      sampleId: next.sampleId,
      lang,
      name: next.name === "Applicant" ? undefined : next.name,
      goal: next.goal,
    });
    window.history.replaceState(null, "", `${window.location.pathname}?${q}${window.location.hash}`);
  };
  const updateGoal = (patch: Partial<Goal>) => {
    const next = normalizeGoal({ ...goal, ...patch });
    setGoal(next);
    sync({ applicant, sampleId, name, goal: next });
  };
  const updateField = (key: FeatureKey, value: number) => {
    const next = { ...applicant, [key]: value };
    setApplicant(next);
    setSampleId(null);
    setName("Applicant");
    sync({ applicant: next, sampleId: null, name: "Applicant", goal });
  };
  const loadSample = (id: string) => {
    const sample = SAMPLES.find((x) => x.id === id);
    if (!sample) return;
    setApplicant(sample.applicant);
    setSampleId(sample.id);
    setName(sample.name);
    sync({ applicant: sample.applicant, sampleId: sample.id, name: sample.name, goal });
  };

  const best = PRICING.tiers.reduce((b, x) => (x.apr < b.apr ? x : b), PRICING.tiers[0]);
  const milestoneKey = gp.milestones.map((m) => `${m.key}@${m.month}`).join("|");
  const methodHref = lang === "en" ? "/method" : `/method?lang=${lang}`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:rounded-2xl lg:[scrollbar-width:thin]">
        <GoalInputs
          lang={lang}
          goal={goal}
          applicant={applicant}
          sampleId={sampleId}
          onGoal={updateGoal}
          onField={updateField}
          onSample={loadSample}
        />
      </aside>

      <div className="grid min-w-0 gap-6">
        {!gp.aprReachable && (
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-pastel-sky p-4 text-deep-sky ring-1 ring-foreground/5 sm:p-5">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{tf(s.status.tooCheap, { apr: aprText(gp.goal.maxApr) })}</p>
              <p className="mt-0.5 text-sm">{tf(s.status.tooCheapSub, { best: aprText(best.apr), score: best.minScore })}</p>
            </div>
          </div>
        )}

        <Reveal>
          <GoalTimelineCard gp={gp} lang={lang} />
        </Reveal>
        <Reveal>
          <ScoreGoalCard gp={gp} lang={lang} />
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-2">
          <Reveal className="grid">
            <PlanSteps gp={gp} lang={lang} />
          </Reveal>
          <Reveal className="grid" delay={0.05}>
            <MilestoneChecklist key={milestoneKey} milestones={gp.milestones} lang={lang} />
          </Reveal>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Reveal className="grid">
            <AffordabilityCard gp={gp} lang={lang} />
          </Reveal>
          <Reveal className="grid" delay={0.05}>
            <TodayCard gp={gp} lang={lang} />
          </Reveal>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {tf(s.footnote.text, { alt: aprText(PRICING.declinedAlternativeApr), cap: pct(PRICING.maxEmiToIncome) })}{" "}
          <Link href={methodHref} className="font-medium text-primary underline underline-offset-4 hover:text-foreground">
            {s.footnote.link}
          </Link>
        </p>
      </div>
    </div>
  );
}
