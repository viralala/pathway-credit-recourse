"use client";

import { ArrowDown, BookmarkCheck, Check } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { analyze } from "@/lib/analyze";
import { summaryText, t, tf, type Lang } from "@/lib/i18n";
import { APPLICANT_LIMITS } from "@/lib/security/validate";
import { SAMPLES } from "@/lib/samples";
import type { Applicant, FeatureKey, LoanType } from "@/lib/types";
import { paramsFor } from "@/lib/url";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AAFetchResult, FieldSource } from "@/lib/aa/types";
import { ConnectBank } from "./connect/ConnectBank";
import { AnswerHero } from "./workbench/AnswerHero";
import { ApplicantForm } from "./workbench/ApplicantForm";
import { HeroBackdrop, HeroIntro } from "./workbench/Hero";
import { MoneySaved } from "./workbench/MoneySaved";
import { MoreTools } from "./workbench/MoreTools";
import { Plan } from "./workbench/Plan";
import { Reasons } from "./workbench/Reasons";
import { SavePlan } from "./workbench/SavePlan";
import { ScoreBreakdown } from "./workbench/ScoreBreakdown";
import { ScorePanel } from "./workbench/ScoreCard";
import { Summary } from "./workbench/Summary";
import { TimelineSection } from "./workbench/TimelineSection";
import { GovernmentSchemesSection } from "./workbench/GovernmentSchemesSection";
import { WhatIf } from "./workbench/WhatIf";

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
  initialLoanType = "unsecured",
  initialLoanAmount = 500_000,
  initialCollateralValue,
  initialRecentHardInquiries = 0,
  lang,
  planId,
}: {
  initialApplicant: Applicant;
  initialName: string;
  initialSampleId: string | null;
  initialLoanType?: LoanType;
  initialLoanAmount?: number;
  initialCollateralValue?: number | null;
  initialRecentHardInquiries?: number;
  lang: Lang;
  /** A saved plan being updated (from "My plans"), or null. */
  planId: string | null;
}) {
  const { user, signInWithGoogle } = useAuth();
  const [applicant, setApplicant] = useState(initialApplicant);
  const [name, setName] = useState(initialName);
  const [sampleId, setSampleId] = useState(initialSampleId);
  const [loanType, setLoanType] = useState<LoanType>(initialLoanType);
  const [loanAmount, setLoanAmount] = useState<number>(initialLoanAmount);
  const [collateralValue, setCollateralValue] = useState<number | null>(
    initialCollateralValue !== undefined
      ? initialCollateralValue
      : initialLoanType === "secured"
        ? 800_000
        : null
  );
  const [recentHardInquiries, setRecentHardInquiries] = useState<number>(initialRecentHardInquiries ?? 0);
  const [aiText, setAiText] = useState<{ key: string; text: string; source: "ai" | "template" } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Fields filled from a linked bank, by feature. A hand edit drops that field's entry.
  const [sources, setSources] = useState<Partial<Record<FeatureKey, FieldSource>> | undefined>(undefined);
  // True from a bank fill until the first hand edit or sample. While true, nothing derived from the
  // fetched numbers goes into the URL, localStorage or the share/report links.
  const [fromBank, setFromBank] = useState(false);
  const ui = t(lang);

  // Inputs stay instant; the (heavier) analysis follows a beat behind while typing.
  const analyzed = useDeferredValue(applicant);
  const r = useMemo(
    () => analyze(analyzed, { loanType, loanAmount, collateralValue, recentHardInquiries }),
    [analyzed, loanType, loanAmount, collateralValue, recentHardInquiries]
  );
  const { assessment: a, plan, timeline } = r;

  const sync = (
    next: Applicant,
    nextSample: string | null,
    nextName: string,
    nextLoanType: LoanType = loanType,
    nextLoanAmount: number = loanAmount,
    nextCollateral: number | null = collateralValue,
    nextInquiries: number = recentHardInquiries
  ) => {
    const q = new URLSearchParams(
      paramsFor(next, {
        sampleId: nextSample,
        lang,
        name: nextName === DEFAULT_NAME ? undefined : nextName,
        loanType: nextLoanType,
        loanAmount: nextLoanAmount,
        collateralValue: nextCollateral,
        recentHardInquiries: nextInquiries,
      })
    );
    if (planId) q.set("plan", planId);
    window.history.replaceState(null, "", `${window.location.pathname}?${q}${window.location.hash}`);
  };
  const dropSources = (keys: FeatureKey[]) =>
    setSources((prev) => {
      if (!prev) return prev;
      const rest = { ...prev };
      for (const k of keys) delete rest[k];
      return Object.keys(rest).length ? rest : undefined;
    });
  const setField = (key: FeatureKey, v: number) => {
    const next = { ...applicant, [key]: v };
    setApplicant(next);
    setSampleId(null);
    setName(DEFAULT_NAME);
    dropSources([key]);
    setFromBank(false);
    sync(next, null, DEFAULT_NAME, loanType, loanAmount, collateralValue, recentHardInquiries);
  };
  // Loan details are not bank data, but the URL carries the applicant too: skip it while bank numbers are untouched.
  const handleLoanType = (type: LoanType) => {
    setLoanType(type);
    const nextCollateral = type === "secured" ? (collateralValue ?? 800_000) : null;
    setCollateralValue(nextCollateral);
    if (!fromBank) sync(applicant, sampleId, name, type, loanAmount, nextCollateral, recentHardInquiries);
  };
  const handleLoanAmount = (amount: number) => {
    setLoanAmount(amount);
    if (!fromBank) sync(applicant, sampleId, name, loanType, amount, collateralValue, recentHardInquiries);
  };
  const handleCollateralValue = (val: number | null) => {
    setCollateralValue(val);
    if (!fromBank) sync(applicant, sampleId, name, loanType, loanAmount, val, recentHardInquiries);
  };
  const handleRecentHardInquiries = (inquiries: number) => {
    const clean = Math.max(0, Math.round(inquiries));
    setRecentHardInquiries(clean);
    if (!fromBank) sync(applicant, sampleId, name, loanType, loanAmount, collateralValue, clean);
  };
  // "What if" apply: a deliberate edit, so changed fields lose their bank source.
  const applyWhatIf = (next: Applicant) => {
    const changed = (Object.keys(next) as FeatureKey[]).filter((k) => next[k] !== applicant[k]);
    setApplicant(next);
    setSampleId(null);
    setName(DEFAULT_NAME);
    dropSources(changed);
    setFromBank(false);
    sync(next, null, DEFAULT_NAME, loanType, loanAmount, collateralValue, recentHardInquiries);
  };
  const fillFromBank = (result: AAFetchResult) => {
    const fetched = result.applicant;
    // A field the accounts could not show (badge "not found") keeps the number already in the form, so the
    // person can type their own; income also falls back when it came back unusable.
    const next = { ...applicant };
    for (const key of Object.keys(fetched) as FeatureKey[]) {
      if (result.sources[key]?.origin === "not-available") continue;
      next[key] = fetched[key];
    }
    const income = Number.isFinite(next.monthlyIncome) && next.monthlyIncome >= APPLICANT_LIMITS.monthlyIncome.min;
    if (!income) next.monthlyIncome = applicant.monthlyIncome;
    setApplicant(next);
    setSources(result.sources);
    setSampleId(null);
    setName(result.holderName || DEFAULT_NAME);
    setFromBank(true);
    // No sync(): fetched numbers stay out of the URL until the person edits a field.
  };
  const handleImportedFinancials = (imported: {
    monthlyIncome: number;
    debtRatio: number;
    openCreditLines: number;
    utilization?: number;
  }) => {
    const next: Applicant = {
      ...applicant,
      monthlyIncome: imported.monthlyIncome,
      debtRatio: imported.debtRatio,
      openCreditLines: imported.openCreditLines,
      ...(typeof imported.utilization === "number" ? { utilization: imported.utilization } : {}),
    };
    setApplicant(next);
    setSampleId(null);
    setName(DEFAULT_NAME);
    sync(next, null, DEFAULT_NAME, loanType, loanAmount, collateralValue, recentHardInquiries);
  };
  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setApplicant(s.applicant);
    setSources(undefined);
    setFromBank(false);
    setSampleId(s.id);
    setName(s.name);
    sync(s.applicant, s.id, s.name, loanType, loanAmount, collateralValue, recentHardInquiries);
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
  const loanParams = { loanType, loanAmount, collateralValue, recentHardInquiries };
  // Bank-fetched numbers never ride in a link: those point at the plain page until the person edits.
  const reportHref = fromBank ? `/report${langQuery}` : `/report?${paramsFor(applicant, { sampleId, lang, name, ...loanParams })}`;
  const fairnessHref = `/fairness${langQuery}`;
  const goalHref = fromBank
    ? `/goal${langQuery}`
    : `/goal?${paramsFor(applicant, { sampleId, lang, name: name === DEFAULT_NAME ? undefined : name, ...loanParams })}`;
  const offerHref = `/offer-check${langQuery}`;
  const homeQuery = new URLSearchParams(
    fromBank
      ? { ...(lang !== "en" ? { lang } : {}) }
      : paramsFor(applicant, { sampleId, lang, name: name === DEFAULT_NAME ? undefined : name, ...loanParams }),
  );
  if (planId) homeQuery.set("plan", planId);
  const returnTo = homeQuery.size ? `/?${homeQuery}` : "/";

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

  async function saveAssessmentWithData(
    appData: Applicant,
    applicantName: string,
    selectedLoanType: LoanType = loanType,
    selectedLoanAmount: number = loanAmount,
    selectedCollateralValue: number | null = collateralValue,
    selectedInquiries: number = recentHardInquiries
  ) {
    setSaving(true);
    setSaveError(null);
    try {
      // 1. Save Assessment
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicant: appData,
          applicantName,
          loanType: selectedLoanType,
          loanAmount: selectedLoanAmount,
          collateralValue: selectedLoanType === "secured" ? selectedCollateralValue : null,
          recentHardInquiries: selectedInquiries,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save assessment. Ensure Supabase tables are created.");
      }
      const assessmentId = json.data?.assessment?.id;

      if (assessmentId) {
        // 2, 3, 4: Persist Recourse, Simulations, Pricing
        await Promise.allSettled([
          fetch("/api/recourse", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assessmentId }),
          }),
          fetch("/api/simulations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assessmentId, runs: 500 }),
          }),
          fetch("/api/pricing", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assessmentId }),
          }),
        ]);

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 5000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save assessment to Supabase";
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 8000);
    } finally {
      setSaving(false);
    }
  }

  async function saveAssessment() {
    if (!user) {
      try {
        // Bank-fetched numbers are never written to browser storage.
        if (!fromBank) {
          localStorage.setItem(
            "pathway_pending_assessment",
            JSON.stringify({
              applicant: analyzed,
              name,
              loanType,
              loanAmount,
              collateralValue: loanType === "secured" ? collateralValue : null,
              recentHardInquiries,
            })
          );
        }
      } catch {
        // Ignore storage errors
      }
      signInWithGoogle("/dashboard");
      return;
    }

    await saveAssessmentWithData(analyzed, name, loanType, loanAmount, collateralValue, recentHardInquiries);
  }

  // Check and process any pending assessment saved prior to OAuth redirect
  useEffect(() => {
    if (!user) return;
    try {
      const pendingRaw = localStorage.getItem("pathway_pending_assessment");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        localStorage.removeItem("pathway_pending_assessment");
        if (pending?.applicant) {
          const applicantData = pending.applicant;
          const applicantName = pending.name || DEFAULT_NAME;
          const pendingLoanType: LoanType = pending.loanType === "secured" ? "secured" : "unsecured";
          const pendingLoanAmount = typeof pending.loanAmount === "number" ? pending.loanAmount : 500_000;
          const pendingCollateral =
            pendingLoanType === "secured" && typeof pending.collateralValue === "number"
              ? pending.collateralValue
              : pendingLoanType === "secured"
                ? 800_000
                : null;
          const pendingInquiries = typeof pending.recentHardInquiries === "number" ? pending.recentHardInquiries : 0;
          setTimeout(() => {
            if (pending.loanType) setLoanType(pendingLoanType);
            setLoanAmount(pendingLoanAmount);
            setCollateralValue(pendingCollateral);
            setRecentHardInquiries(pendingInquiries);
            saveAssessmentWithData(
              applicantData,
              applicantName,
              pendingLoanType,
              pendingLoanAmount,
              pendingCollateral,
              pendingInquiries
            );
          }, 0);
        }
      }
    } catch {
      // Ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
                  loanType={loanType}
                  loanAssessment={r.loanAssessment}
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              {/* Once the form holds bank numbers the connect card has done its job; it returns after a sample or full edit. */}
              {!sources && (
                <div className="mb-4">
                  <ConnectBank lang={lang} onFilled={fillFromBank} />
                </div>
              )}
              <ApplicantForm
                ui={ui}
                lang={lang}
                applicant={applicant}
                sources={sources}
                loanType={loanType}
                loanAmount={loanAmount}
                collateralValue={collateralValue}
                recentHardInquiries={recentHardInquiries}
                onField={setField}
                onLoanType={handleLoanType}
                onLoanAmount={handleLoanAmount}
                onCollateralValue={handleCollateralValue}
                onRecentHardInquiries={handleRecentHardInquiries}
                onImportedFinancials={handleImportedFinancials}
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 text-[15px] font-bold">
                  <a href="#why">
                    {ui.assess}
                    <ArrowDown aria-hidden />
                  </a>
                </Button>

                <Button
                  type="button"
                  variant={savedSuccess ? "outline" : "secondary"}
                  size="lg"
                  disabled={saving}
                  onClick={saveAssessment}
                  className={`h-12 gap-2 rounded-xl px-5 text-[14px] font-bold transition-all ${
                    savedSuccess ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : ""
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="size-4" />
                      <span>Saved to Account!</span>
                    </>
                  ) : saving ? (
                    <span>Saving to Account...</span>
                  ) : (
                    <>
                      <BookmarkCheck className="size-4" />
                      <span>{user ? "Save to Dashboard" : "Sign in & Save"}</span>
                    </>
                  )}
                </Button>
              </div>

              {saveError && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <p className="font-semibold">Unable to save assessment:</p>
                  <p className="mt-0.5">{saveError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AnswerHero lang={lang} analysis={r} />

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
      <ScoreBreakdown lang={lang} applicant={analyzed} />
      <Plan ui={ui} lang={lang} approved={a.approved} feasible={feasible} plan={plan} horizon={r.horizon} />
      <WhatIf lang={lang} applicant={applicant} onApply={applyWhatIf} />
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
      <GovernmentSchemesSection
        applicant={applicant}
        loanType={loanType}
        loanAmount={loanAmount}
        collateralValue={collateralValue}
        applicantName={name}
      />
      <MoreTools ui={ui} goalHref={goalHref} offerHref={offerHref} fairnessHref={fairnessHref} />
    </div>
  );
}
