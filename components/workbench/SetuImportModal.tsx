"use client";

import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/i18n";
import type { NormalizedFinancialData } from "@/lib/setu/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface SetuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImportedData: (data: {
    monthlyIncome: number;
    debtRatio: number;
    openCreditLines: number;
    utilization?: number;
  }) => void;
}

type ImportStep = "consent_info" | "waiting_approval" | "processing" | "review" | "error";

export function SetuImportModal({ isOpen, onClose, onApplyImportedData }: SetuImportModalProps) {
  const { user, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<ImportStep>("consent_info");
  const [phone, setPhone] = useState("9876543210");
  const [consentId, setConsentId] = useState<string | null>(null);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [normalizedData, setNormalizedData] = useState<NormalizedFinancialData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  async function handleStartConsent() {
    if (!user) {
      signInWithGoogle();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/setu/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: phone.replace(/\D/g, "") || "9876543210",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.consentId) {
        throw new Error(json.error?.message || "Failed to initialize Setu AA consent request.");
      }

      setConsentId(json.data.consentId);
      setConsentUrl(json.data.url || null);
      setStep("waiting_approval");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to initiate consent with Setu AA Gateway.");
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCheckStatusAndFetch(providedConsentId?: string) {
    const id = providedConsentId || consentId;
    if (!id) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Verify consent status
      const statusRes = await fetch(`/api/setu/status?consentId=${encodeURIComponent(id)}`);
      const statusJson = await statusRes.json().catch(() => ({}));

      if (!statusRes.ok || !statusJson.success) {
        throw new Error(statusJson.error?.message || "Failed to check consent approval status.");
      }

      const status = statusJson.data?.status;
      if (status === "REJECTED" || status === "REVOKED") {
        throw new Error("Consent was rejected or revoked on the Account Aggregator.");
      }

      setStep("processing");

      // 2. Fetch and normalize financial data
      const dataRes = await fetch("/api/setu/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId: id }),
      });

      const dataJson = await dataRes.json().catch(() => ({}));
      if (!dataRes.ok || !dataJson.success || !dataJson.data?.normalized) {
        throw new Error(dataJson.error?.message || "Failed to retrieve and process financial information.");
      }

      setNormalizedData(dataJson.data.normalized);
      setStep("review");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error processing financial data from Setu.");
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirmApply() {
    if (!normalizedData) return;

    onApplyImportedData({
      monthlyIncome: normalizedData.monthlyIncome,
      debtRatio: normalizedData.debtRatio,
      openCreditLines: normalizedData.openCreditLines,
      utilization: normalizedData.utilization,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setu-modal-title"
        className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8 overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        {/* STEP 1: Consent Information & Initiation */}
        {step === "consent_info" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 id="setu-modal-title" className="text-lg font-black text-foreground">
                  Import Financial Data (Setu AA)
                </h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Setu Sandbox Environment
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Import verified bank cash flow and recurring obligations directly through the RBI-regulated Account Aggregator ecosystem.
            </p>

            {/* Transparent Consent Disclosure Box */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Shield className="size-4 text-primary" />
                <span>Explicit Consent & Data Privacy Policy</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Purpose:</strong> Loan assessment, FOIR calculation, and recourse plan derivation.</li>
                <li><strong>Data Scope:</strong> 6 months of savings/deposit account summaries and transaction aggregates.</li>
                <li><strong>Fetch Mode:</strong> One-time pull (`ONETIME`). No recurring background queries.</li>
                <li><strong>Data Minimization:</strong> Raw bank transaction lines are discarded immediately on the server. Pathway stores ONLY derived summary numbers.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="setu-phone-input" className="block text-xs font-semibold text-foreground">
                Mobile Number linked to Bank Accounts
              </label>
              <input
                id="setu-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210 (Default Sandbox Mock)"
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
              />
              <span className="text-[11px] text-muted-foreground">
                *In Sandbox, any 10-digit number connects with pre-populated Mock FIP banks (HDFC, SBI, BOB).
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStartConsent}
                disabled={isProcessing}
                className="gap-2 rounded-xl font-bold"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Initiating Consent...</span>
                  </>
                ) : (
                  <>
                    <span>{user ? "Proceed to Setu AA" : "Sign In & Connect"}</span>
                    <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Waiting for User Consent Approval */}
        {step === "waiting_approval" && (
          <div className="space-y-5 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">Awaiting Setu Consent Approval</h3>
              <p className="text-xs text-muted-foreground">
                Consent request initiated (`{consentId?.slice(0, 18)}...`). Please approve on the Setu screen.
              </p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground space-y-3">
              <p className="font-medium">
                Click below to view the Setu AA approval screen or test simulation:
              </p>
              {consentUrl && (
                <a
                  href={consentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span>Open Setu Consent Gateway</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckStatusAndFetch()}
                disabled={isProcessing}
                className="gap-2 rounded-xl font-bold"
              >
                {isProcessing ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                <span>Check Status & Import Data</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Server Normalization & Ingestion */}
        {step === "processing" && (
          <div className="space-y-4 text-center py-8">
            <RefreshCw className="mx-auto size-10 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Processing Bank Information</h3>
              <p className="text-xs text-muted-foreground">
                Normalizing cash flows and extracting debt ratios securely on the server...
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Review Screen */}
        {step === "review" && normalizedData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Imported Financial Information</h3>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Source: Setu Account Aggregator Sandbox
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card divide-y divide-border text-xs">
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Derived Monthly Income</span>
                <span className="font-bold text-sm text-foreground tabular-nums">
                  {money(normalizedData.monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Monthly Fixed Obligations (EMI)</span>
                <span className="font-bold text-sm text-foreground tabular-nums">
                  {money(normalizedData.monthlyObligations)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Derived Debt Ratio (FOIR)</span>
                <span className="font-bold text-sm text-primary tabular-nums">
                  {(normalizedData.debtRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Verified Deposit Accounts</span>
                <span className="font-semibold text-foreground">
                  {normalizedData.detectedAccountsCount} Linked Account(s)
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Salary Confidence Level</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                  {normalizedData.salaryConfidence} Confidence
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              *Raw transaction statements were safely discarded. You can review and edit these numbers anytime.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Edit Manually
              </Button>
              <Button
                type="button"
                onClick={handleConfirmApply}
                className="gap-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-4" />
                <span>Use This Information</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Error Screen */}
        {step === "error" && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Unable to Complete Import</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {errorMessage || "An unexpected error occurred while communicating with the Setu AA gateway."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
                Enter Manually Instead
              </Button>
              <Button type="button" onClick={() => setStep("consent_info")} className="rounded-xl font-bold">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
