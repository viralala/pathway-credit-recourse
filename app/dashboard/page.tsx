"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Layers,
  LogIn,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  XCircle,
  AlertTriangle,
  Check
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { paramsFor } from "@/lib/url";
import type { Applicant } from "@/lib/types";

interface AssessmentRecord {
  id: string;
  monthly_income: number;
  utilization: number;
  debt_ratio: number;
  age: number;
  open_credit_lines: number;
  late_30: number;
  late_60: number;
  late_90: number;
  dependents: number;
  real_estate_loans: number;
  applicant_name: string | null;
  predicted_score: number;
  pd: number;
  decision: "approved" | "declined";
  reasons: Array<{ key: string; label: string; impact: number; points: number; value: number }>;
  model_version: string;
  created_at: string;
  recourse_plans?: Array<{
    id: string;
    target_score: number;
    projected_score: number;
    status: string;
    actions: Array<{ key: string; kind: string; from: number; to: number; effort: number; months: number }>;
    estimated_months: number;
    effort_score: number;
    flips_decision: boolean;
  }>;
  simulations?: Array<{
    id: string;
    likely_month: number | null;
    best_month: number | null;
    worst_month: number | null;
    approval_within_horizon: number | null;
  }>;
  pricing_results?: Array<{
    id: string;
    loan_amount: number;
    loan_term_months: number;
    current_apr: number;
    projected_apr: number;
    current_emi: number;
    projected_emi: number;
    estimated_savings: number;
  }>;
  outcomes?: Array<{
    id: string;
    actual_outcome: string;
    actual_score: number | null;
    verified: boolean;
    outcome_date: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRecord | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeScore, setOutcomeScore] = useState("");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoadingAssessments(true);
      const res = await fetch("/api/assessments");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAssessments(json.data);
          if (json.data.length > 0) {
            setSelectedAssessment(json.data[0]);
          }
        }
      }
    } catch {
      // API error handled
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!user) return;

    async function loadData() {
      // 1. Process pending assessment if user just completed Google OAuth sign-in
      try {
        const pendingRaw = localStorage.getItem("pathway_pending_assessment");
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          localStorage.removeItem("pathway_pending_assessment");
          if (pending?.applicant) {
            const res = await fetch("/api/assessments", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ applicant: pending.applicant, applicantName: pending.name || "Applicant" }),
            });
            const json = await res.json().catch(() => ({}));
            const assessmentId = json.data?.assessment?.id;
            if (assessmentId) {
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
            }
          }
        }
      } catch {
        // Ignore storage error
      }

      // 2. Fetch all assessments
      try {
        const res = await fetch("/api/assessments");
        if (res.ok) {
          const json = await res.json();
          if (active && json?.success && Array.isArray(json.data)) {
            setAssessments(json.data);
            if (json.data.length > 0) {
              setSelectedAssessment(json.data[0]);
            }
          }
        }
      } finally {
        if (active) setLoadingAssessments(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [user]);

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/assessments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssessments((prev) => prev.filter((a) => a.id !== id));
        if (selectedAssessment?.id === id) {
          const remaining = assessments.filter((a) => a.id !== id);
          setSelectedAssessment(remaining[0] || null);
        }
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !outcomeText.trim()) return;

    setSubmittingOutcome(true);
    try {
      const res = await fetch("/api/outcomes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          actualOutcome: outcomeText.trim(),
          actualScore: outcomeScore ? Number(outcomeScore) : undefined,
        }),
      });

      if (res.ok) {
        setOutcomeSaved(true);
        setOutcomeText("");
        setOutcomeScore("");
        await fetchAssessments();
        setTimeout(() => setOutcomeSaved(false), 4000);
      }
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "WARNING: This will permanently delete your account, profile, all assessments, recourse plans, and simulations. This action cannot be undone. Proceed?"
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
        <div className="max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="size-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Sign In to Pathway Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your Google account to access your saved assessments, monitor recourse plans, and track your credit journey.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => signInWithGoogle("/dashboard")}
            className="h-12 w-full gap-3 rounded-xl font-bold shadow-xs"
          >
            <LogIn className="size-4" />
            <span>Continue with Google</span>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Applicant";
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

  const latest = assessments[0] || null;
  const latestPlan = latest?.recourse_plans?.[0] || null;
  const latestPricing = latest?.pricing_results?.[0] || null;

  return (
    <div className="page-container py-8 sm:py-12">
      {/* Top Profile Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-14 rounded-2xl object-cover ring-2 ring-border shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                Welcome back, {displayName}
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Verified Account
              </span>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="default" size="sm" className="gap-2 rounded-xl font-bold">
            <Link href="/">
              <PlusCircle className="size-4" />
              <span>New Assessment</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => signOut()} className="rounded-xl">
            Log out
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Latest Score</span>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground sm:text-3xl">
              {latest ? Math.round(latest.predicted_score) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">/ 900</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? (
              <span className={latest.decision === "approved" ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                {latest.decision === "approved" ? "Approved" : "Needs Recourse"}
              </span>
            ) : (
              "No assessments yet"
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Target Score</span>
            <Target className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground sm:text-3xl">
              {latestPlan ? Math.round(latestPlan.target_score) : "680"}
            </span>
            <span className="text-xs text-muted-foreground">cut-off</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {latestPlan ? `${latestPlan.estimated_months} mo timeline` : "Standard prime threshold"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Est. Savings</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground sm:text-3xl">
              {latestPricing ? `$${Math.round(latestPricing.estimated_savings).toLocaleString()}` : "$0"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Interest avoided via recourse</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Assessments</span>
            <Layers className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground sm:text-3xl">{assessments.length}</span>
            <span className="text-xs text-muted-foreground">records</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Persistent across sessions</p>
        </div>
      </div>

      {loadingAssessments ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-primary" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <History className="mx-auto size-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-lg font-bold text-foreground">No assessments recorded yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Run an assessment from the home workbench to automatically compute and store your score, recourse plan, and simulations.
          </p>
          <Button asChild size="lg" className="mt-6 gap-2 rounded-xl font-bold">
            <Link href="/">
              <PlusCircle className="size-4" />
              <span>Launch First Assessment</span>
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Assessment History List */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-foreground">Assessment History</h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {assessments.length} total
              </span>
            </div>

            <div className="space-y-2.5">
              {assessments.map((item, idx) => {
                const isSelected = selectedAssessment?.id === item.id;
                const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAssessment(item)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            Assessment #{assessments.length - idx}
                          </span>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {item.model_version}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-foreground">
                            {Math.round(item.predicted_score)}
                          </span>
                          {item.decision === "approved" ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" /> Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <XCircle className="size-3" /> Declined
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAssessment(item.id);
                        }}
                        className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete assessment"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {dateStr}
                      </span>
                      <span>Income: ${Math.round(item.monthly_income).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Assessment Details */}
          {selectedAssessment && (
            <div className="space-y-6 lg:col-span-8">
              {/* Detail Card Header */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>Model Version: {selectedAssessment.model_version}</span>
                      <span>•</span>
                      <span>
                        Created: {new Date(selectedAssessment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <h2 className="text-2xl font-black text-foreground">
                        Score: {Math.round(selectedAssessment.predicted_score)}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          selectedAssessment.decision === "approved"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {selectedAssessment.decision === "approved" ? "Approved" : "Declined (Recourse Available)"}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const applicantObj: Applicant = {
                      monthlyIncome: Number(selectedAssessment.monthly_income),
                      utilization: Number(selectedAssessment.utilization),
                      debtRatio: Number(selectedAssessment.debt_ratio),
                      age: Number(selectedAssessment.age),
                      openCreditLines: Number(selectedAssessment.open_credit_lines),
                      late30: Number(selectedAssessment.late_30),
                      late60: Number(selectedAssessment.late_60),
                      late90: Number(selectedAssessment.late_90),
                      dependents: Number(selectedAssessment.dependents),
                      realEstateLoans: Number(selectedAssessment.real_estate_loans),
                    };
                    const query = paramsFor(applicantObj, {
                      name: selectedAssessment.applicant_name || undefined,
                    });
                    return (
                      <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl font-bold">
                        <Link href={`/?${query}`}>
                          <span>Load in Workbench</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    );
                  })()}
                </div>

                {/* Input feature pills */}
                <div className="mt-6 border-t border-border pt-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Input Features
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Monthly Income</div>
                      <div className="font-bold text-foreground">
                        ${Number(selectedAssessment.monthly_income).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Utilization</div>
                      <div className="font-bold text-foreground">
                        {(Number(selectedAssessment.utilization) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Debt Ratio</div>
                      <div className="font-bold text-foreground">
                        {(Number(selectedAssessment.debt_ratio) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Credit Lines</div>
                      <div className="font-bold text-foreground">
                        {selectedAssessment.open_credit_lines} open
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Late 30-59 Days</div>
                      <div className="font-bold text-foreground">{selectedAssessment.late_30}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Late 60-89 Days</div>
                      <div className="font-bold text-foreground">{selectedAssessment.late_60}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Late 90+ Days</div>
                      <div className="font-bold text-foreground">{selectedAssessment.late_90}</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-muted-foreground">Dependents</div>
                      <div className="font-bold text-foreground">{selectedAssessment.dependents}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recourse Plan Details */}
              {selectedAssessment.recourse_plans && selectedAssessment.recourse_plans.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-primary" />
                      <h3 className="text-base font-extrabold text-foreground">
                        Persisted Recourse Plan
                      </h3>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                      {selectedAssessment.recourse_plans[0].estimated_months} Months Horizon
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedAssessment.recourse_plans[0].actions?.map((action, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs sm:text-sm"
                      >
                        <div>
                          <span className="font-bold text-foreground capitalize">
                            {action.key === "wait" ? "Calendar Ageing" : action.key}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {action.key === "utilization"
                              ? `Pay down to ${(action.to * 100).toFixed(0)}%`
                              : action.key === "debtRatio"
                                ? `Lower debt ratio to ${(action.to * 100).toFixed(0)}%`
                                : action.key === "monthlyIncome"
                                  ? `Grow income to $${Math.round(action.to).toLocaleString()}`
                                  : action.key === "wait"
                                    ? `Allow late payments to age out (${action.months} mo)`
                                    : `Adjust by ${action.to}`}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {action.months} mo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Continuous Learning / Outcome Tracker */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  <h3 className="text-base font-extrabold text-foreground">
                    Continuous Learning — Track Real Outcome
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Did you follow this plan? Record the actual outcome to contribute to offline model evaluation and future retraining.
                </p>

                {selectedAssessment.outcomes && selectedAssessment.outcomes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recorded Outcomes
                    </h4>
                    {selectedAssessment.outcomes.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3 text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground">{o.actual_outcome}</span>
                          {o.actual_score && (
                            <span className="ml-2 text-muted-foreground">
                              Score: {o.actual_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              o.verified
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {o.verified ? "Verified Outcome" : "Pending Verification"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(o.outcome_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleRecordOutcome} className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-foreground">
                        Actual Outcome / Status
                      </label>
                      <input
                        type="text"
                        required
                        value={outcomeText}
                        onChange={(e) => setOutcomeText(e.target.value)}
                        placeholder="e.g., Approved after 6 months of paydown"
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground">
                        Actual Score (optional)
                      </label>
                      <input
                        type="number"
                        min="300"
                        max="900"
                        value={outcomeScore}
                        onChange={(e) => setOutcomeScore(e.target.value)}
                        placeholder="e.g., 695"
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {outcomeSaved ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <Check className="size-4" /> Outcome recorded successfully!
                      </span>
                    ) : (
                      <span />
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingOutcome || !outcomeText.trim()}
                      className="rounded-xl font-bold"
                    >
                      {submittingOutcome ? "Saving..." : "Record Outcome"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Data Privacy & Account Deletion */}
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
                <div className="flex items-center gap-2 text-destructive font-bold">
                  <AlertTriangle className="size-5" />
                  <h3>Account & Data Privacy (GDPR / Right to be Forgotten)</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can permanently delete your profile, credit assessments, recourse plans, and simulations from Supabase PostgreSQL at any time.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeletingAccount}
                    onClick={handleDeleteAccount}
                    className="rounded-xl font-bold"
                  >
                    {isDeletingAccount ? "Deleting..." : "Permanently Delete My Data"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
