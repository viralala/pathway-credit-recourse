"use client";

import { useState, useId } from "react";
import { Building2, CreditCard, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { money, tf, type UIStrings } from "@/lib/i18n";
import { APPLICANT_LIMITS } from "@/lib/security/validate";
import type { Applicant, FeatureKey, LoanType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NumberField } from "./NumberField";
import { SetuImportModal } from "./SetuImportModal";

type Unit = "money" | "pct" | "count";
interface FieldSpec {
  key: FeatureKey;
  unit: Unit;
  /** Lower bound; defaults to 0. Mirrors APPLICANT_LIMITS in lib/security/validate.ts. */
  min?: number;
  max: number;
}

/** Field layout: the four that matter most first, then late-payment history. Every field here is a model input. */
export const PRIMARY_FIELDS: FieldSpec[] = [
  { key: "monthlyIncome", unit: "money", min: APPLICANT_LIMITS.monthlyIncome.min, max: 20_00_000 },
  { key: "utilization", unit: "pct", max: 150 },
  { key: "debtRatio", unit: "pct", max: 300 },
  { key: "openCreditLines", unit: "count", max: 30 },
];
export const SECONDARY_FIELDS: FieldSpec[] = [
  { key: "late30", unit: "count", max: 10 },
  { key: "late60", unit: "count", max: 10 },
  { key: "late90", unit: "count", max: 10 },
];

function Field({
  spec,
  label,
  value,
  big,
  belowMinMessage,
  onChange,
}: {
  spec: FieldSpec;
  label: string;
  value: number;
  big?: boolean;
  belowMinMessage?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const shown = spec.unit === "pct" ? Math.round(value * 100) : Math.round(value);
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id} className="leading-snug font-medium text-muted-foreground">
        {label}
        {spec.unit !== "count" && <span className="sr-only"> ({spec.unit === "pct" ? "%" : "₹"})</span>}
      </Label>
      <NumberField
        id={id}
        value={shown}
        min={spec.min ?? 0}
        belowMinMessage={belowMinMessage}
        max={spec.max}
        step={spec.unit === "money" ? 1000 : 1}
        prefix={spec.unit === "money" ? "₹" : undefined}
        suffix={spec.unit === "pct" ? "%" : undefined}
        onValue={(v) => onChange(spec.unit === "pct" ? v / 100 : v)}
        inputClassName={cn(big ? "h-12 text-xl" : "text-base")}
      />
    </div>
  );
}

/** Every model input with a visible label. Values update the analysis as you type. */
export function ApplicantForm({
  ui,
  applicant,
  loanType = "unsecured",
  loanAmount = 500_000,
  collateralValue,
  recentHardInquiries = 0,
  onField,
  onLoanType,
  onLoanAmount,
  onCollateralValue,
  onRecentHardInquiries,
  onImportedFinancials,
}: {
  ui: UIStrings;
  applicant: Applicant;
  loanType?: LoanType;
  loanAmount?: number;
  collateralValue?: number | null;
  recentHardInquiries?: number;
  onField: (key: FeatureKey, v: number) => void;
  onLoanType?: (type: LoanType) => void;
  onLoanAmount?: (amount: number) => void;
  onCollateralValue?: (value: number | null) => void;
  onRecentHardInquiries?: (inquiries: number) => void;
  onImportedFinancials?: (imported: {
    monthlyIncome: number;
    debtRatio: number;
    openCreditLines: number;
    utilization?: number;
  }) => void;
}) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "import">("manual");
  const loanAmountId = useId();
  const collateralId = useId();
  const hardInquiriesId = useId();

  const handleApplySetuData = (data: {
    monthlyIncome: number;
    debtRatio: number;
    openCreditLines: number;
    utilization?: number;
  }) => {
    setEntryMode("import");
    if (onImportedFinancials) {
      onImportedFinancials(data);
    } else {
      onField("monthlyIncome", data.monthlyIncome);
      onField("debtRatio", data.debtRatio);
      onField("openCreditLines", data.openCreditLines);
      if (typeof data.utilization === "number") {
        onField("utilization", data.utilization);
      }
    }
  };

  return (
    <section
      aria-labelledby="profile-title"
      className="rounded-2xl bg-card/90 p-5 ring-1 ring-foreground/10 backdrop-blur-sm sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4 mb-5">
        <div>
          <h2 id="profile-title" className="text-xl font-extrabold tracking-tight">
            {ui.profileTitle}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{ui.profileSub}</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setEntryMode("manual")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer",
              entryMode === "manual" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Enter Manually
          </button>
          <button
            type="button"
            onClick={() => {
              setImportModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer",
              entryMode === "import" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="size-3.5" />
            <span>Import (Setu AA)</span>
          </button>
        </div>
      </div>

      <SetuImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onApplyImportedData={handleApplySetuData}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        {PRIMARY_FIELDS.map((f) => (
          <Field
            key={f.key}
            big
            spec={f}
            label={ui.fields[f.key]}
            value={applicant[f.key]}
            belowMinMessage={f.key === "monthlyIncome" ? tf(ui.incomeMin, { min: money(f.min ?? 0) }) : undefined}
            onChange={(v) => onField(f.key, v)}
          />
        ))}
      </div>

      <h3 className="mt-8 text-sm font-bold text-foreground">{ui.historyTitle}</h3>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECONDARY_FIELDS.map((f) => (
          <Field key={f.key} spec={f} label={ui.fields[f.key]} value={applicant[f.key]} onChange={(v) => onField(f.key, v)} />
        ))}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Loan Information</h3>
          <span className="text-[11px] font-medium text-muted-foreground">Required for Application Assessment</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Specify loan facility structure and parameters. (ML credit risk score is evaluated independently).
        </p>

        <div className="mt-4">
          <Label className="leading-snug font-medium text-muted-foreground">
            Loan Type
          </Label>
          <div role="radiogroup" aria-label="Loan Type" className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              role="radio"
              aria-checked={loanType === "unsecured"}
              onClick={() => {
                onLoanType?.("unsecured");
                onCollateralValue?.(null);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                loanType === "unsecured"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card/60 hover:border-foreground/20 hover:bg-muted/40"
              )}
            >
              <div className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                loanType === "unsecured" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <CreditCard className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Unsecured Loan</span>
                  {loanType === "unsecured" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No collateral pledged (personal loan, card, credit line). Underwritten on income & debt ratio.
                </p>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={loanType === "secured"}
              onClick={() => {
                onLoanType?.("secured");
                if (!collateralValue) onCollateralValue?.(800_000);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                loanType === "secured"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card/60 hover:border-foreground/20 hover:bg-muted/40"
              )}
            >
              <div className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                loanType === "secured" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Secured Loan</span>
                  {loanType === "secured" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Backed by collateral (property, vehicle, deposit). Reduces lender loss given default.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={loanAmountId} className="leading-snug font-medium text-muted-foreground">
              Loan Amount
              <span className="sr-only"> (₹)</span>
            </Label>
            <NumberField
              id={loanAmountId}
              value={loanAmount}
              min={10_000}
              max={50_00_000}
              step={10_000}
              prefix="₹"
              onValue={(v) => onLoanAmount?.(Math.round(v))}
              inputClassName="h-12 text-lg font-bold"
            />
          </div>

          {loanType === "secured" && (
            <div className="grid content-start gap-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label htmlFor={collateralId} className="leading-snug font-medium text-muted-foreground">
                  Collateral Value
                  <span className="sr-only"> (₹)</span>
                </Label>
                {collateralValue && collateralValue > 0 && (
                  <span className="text-[11px] font-bold text-primary tabular-nums">
                    LTV: {((loanAmount / collateralValue) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <NumberField
                id={collateralId}
                value={collateralValue ?? 800_000}
                min={10_000}
                max={1_00_00_000}
                step={25_000}
                prefix="₹"
                onValue={(v) => onCollateralValue?.(Math.round(v))}
                inputClassName="h-12 text-lg font-bold border-primary/40 bg-primary/5"
              />
            </div>
          )}

          <div className={cn("grid content-start gap-1.5", loanType === "secured" ? "min-[420px]:col-span-2" : "")}>
            <Label htmlFor={hardInquiriesId} className="leading-snug font-medium text-muted-foreground">
              Recent Hard Credit Inquiries (Last 6 Months)
            </Label>
            <NumberField
              id={hardInquiriesId}
              value={recentHardInquiries}
              min={0}
              max={20}
              step={1}
              onValue={(v) => onRecentHardInquiries?.(Math.max(0, Math.round(v)))}
              inputClassName="h-12 text-lg font-bold"
            />
            <p className="text-[11px] text-muted-foreground">
              Number of recent hard credit inquiries. Soft inquiries are not included.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
