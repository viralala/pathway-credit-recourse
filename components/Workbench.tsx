"use client";

import { ArrowDown } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { analyze } from "@/lib/analyze";
import { summaryText, t, tf, type Lang } from "@/lib/i18n";
import { SAMPLES } from "@/lib/samples";
import type { Applicant, FeatureKey } from "@/lib/types";
import { paramsFor } from "@/lib/url";
import { ApplicantForm } from "./workbench/ApplicantForm";
import { HeroBackdrop, HeroIntro } from "./workbench/Hero";
import { MoneySaved } from "./workbench/MoneySaved";
import { MoreTools } from "./workbench/MoreTools";
import { Plan } from "./workbench/Plan";
import { Reasons } from "./workbench/Reasons";
import { SavePlan } from "./workbench/SavePlan";
import { ScorePanel } from "./workbench/ScoreCard";
import { Summary } from "./workbench/Summary";
import { TimelineSection } from "./workbench/TimelineSection";

const DEFAULT_NAME = "Applicant";

/**
 * The applicant workbench (home page): edit a profile or pick a demo applicant, and see the score,
 * the reasons, the plan, what it is worth in money and the month-by-month timeline. State lives
 * here; every section below is a presentational component in components/workbench/.
 */
export function Workbench({
  initialApplicant,
  initialName,
  initialSampleId,
  lang,
  planId,
}: {
  initialApplicant: Applicant;
  initialName: string;
  initialSampleId: string | null;
  lang: Lang;
  /** A saved plan being updated (from "My plans"), or null. */
  planId: string | null;
}) {
  const [applicant, setApplicant] = useState(initialApplicant);
  const [name, setName] = useState(initialName);
  const [sampleId, setSampleId] = useState(initialSampleId);
  const [aiText, setAiText] = useState<{ key: string; text: string; source: "ai" | "template" } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const ui = t(lang);

  // Inputs stay instant; the (heavier) analysis follows a beat behind while typing.
  const analyzed = useDeferredValue(applicant);
  const r = useMemo(() => analyze(analyzed), [analyzed]);
  const { assessment: a, plan, timeline } = r;

  const sync = (next: Applicant, nextSample: string | null, nextName: string) => {
    const q = new URLSearchParams(paramsFor(next, { sampleId: nextSample, lang, name: nextName === DEFAULT_NAME ? undefined : nextName }));
    if (planId) q.set("plan", planId);
    window.history.replaceState(null, "", `${window.location.pathname}?${q}${window.location.hash}`);
  };
  const setField = (key: FeatureKey, v: number) => {
    const next = { ...applicant, [key]: v };
    setApplicant(next);
    setSampleId(null);
    setName(DEFAULT_NAME);
    sync(next, null, DEFAULT_NAME);
  };
  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setApplicant(s.applicant);
    setSampleId(s.id);
    setName(s.name);
    sync(s.applicant, s.id, s.name);
  };

  const feasible = r.recourse.status === "plan";
  const approvalLabel = a.approved
    ? ui.approvedNow
    : timeline.approvalMonth === null
      ? tf(ui.noPlan, { n: r.horizon })
      : timeline.approvalMonth === 1
        ? ui.approvedIn1
        : tf(ui.approvedIn, { n: timeline.approvalMonth });
  const summary = summaryText(lang, {
    name,
    approved: a.approved,
    score: a.score,
    threshold: r.thresholdScore,
    topReason: a.reasons[0] ? { key: a.reasons[0].key, value: a.reasons[0].value } : null,
    approvalMonth: timeline.approvalMonth,
    horizon: r.horizon,
  });

  const langQuery = lang !== "en" ? `?lang=${lang}` : "";
  const reportHref = `/report?${paramsFor(applicant, { sampleId, lang, name })}`;
  const fairnessHref = `/fairness${langQuery}`;
  const goalHref = `/goal?${paramsFor(applicant, { sampleId, lang, name: name === DEFAULT_NAME ? undefined : name })}`;
  const offerHref = `/offer-check${langQuery}`;
  const homeQuery = new URLSearchParams(paramsFor(applicant, { sampleId, lang, name: name === DEFAULT_NAME ? undefined : name }));
  if (planId) homeQuery.set("plan", planId);
  const returnTo = `/?${homeQuery}`;

  async function rewrite() {
    const key = summary;
    setRewriting(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicant: analyzed, name, lang }),
      });
      if (!res.ok) throw new Error(`explain failed: ${res.status}`);
      const j = (await res.json()) as { text?: unknown; source?: unknown };
      const text = typeof j.text === "string" ? j.text.trim() : "";
      if (text) setAiText({ key, text, source: j.source === "ai" ? "ai" : "template" });
    } catch {
      // Keep the template text: the rewrite is optional.
    } finally {
      setRewriting(false);
    }
  }
  const current = aiText && aiText.key === summary ? aiText : null;

  return (
    <div lang={lang}>
      <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
        <HeroBackdrop />
        <div className="page-container pt-8 pb-12 sm:pt-12 lg:pb-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <HeroIntro ui={ui} sampleId={sampleId} onSample={loadSample} />
            </div>
            <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
              <div className="lg:sticky lg:top-24">
                <ScorePanel
                  ui={ui}
                  assessment={a}
                  thresholdScore={r.thresholdScore}
                  approvalLabel={approvalLabel}
                  reportHref={reportHref}
                  fairnessHref={fairnessHref}
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <ApplicantForm ui={ui} applicant={applicant} onField={setField} />
              <Button asChild size="lg" className="mt-6 h-12 rounded-xl px-6 text-[15px] font-bold">
                <a href="#why">
                  {ui.assess}
                  <ArrowDown aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="page-container grid gap-4">
        <SavePlan
          key={JSON.stringify(applicant)}
          ui={ui}
          lang={lang}
          applicant={applicant}
          name={name === DEFAULT_NAME ? "" : name}
          planId={planId}
          returnTo={returnTo}
        />
        <Summary
          ui={ui}
          text={current?.text ?? summary}
          source={current?.source ?? "template"}
          rewriting={rewriting}
          onRewrite={rewrite}
        />
      </div>

      <Reasons ui={ui} lang={lang} reasons={a.reasons} />
      <Plan ui={ui} lang={lang} approved={a.approved} feasible={feasible} plan={plan} horizon={r.horizon} />
      <MoneySaved ui={ui} lang={lang} analysis={r} />
      <TimelineSection
        ui={ui}
        lang={lang}
        timeline={timeline}
        uncertainty={r.uncertainty}
        approvalLabel={approvalLabel}
        thresholdScore={r.thresholdScore}
        horizon={r.horizon}
      />
      <MoreTools ui={ui} goalHref={goalHref} offerHref={offerHref} fairnessHref={fairnessHref} />
    </div>
  );
}
