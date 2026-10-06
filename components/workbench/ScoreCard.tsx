"use client";

import { ArrowRight, CircleCheck, CircleAlert, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/motion/CountUp";
import { displayScore, pct, type UIStrings } from "@/lib/i18n";
import type { Assessment } from "@/lib/model";
import type { LoanAssessment, LoanType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BauhausArt, Scribble } from "../BauhausArt";

const pos = (s: number) => `${Math.min(100, Math.max(0, ((s - 300) / 600) * 100))}%`;

/** Score, decision and projected approval, floating on the pastel tile wall. */
export function ScorePanel({
  ui,
  assessment,
  thresholdScore,
  approvalLabel,
  reportHref,
  fairnessHref,
  loanType = "unsecured",
  loanAssessment,
}: {
  ui: UIStrings;
  assessment: Assessment;
  thresholdScore: number;
  approvalLabel: string;
  reportHref: string;
  fairnessHref: string;
  loanType?: LoanType;
  loanAssessment?: LoanAssessment;
}) {
  const a = assessment;
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-pastel-butter ring-1 ring-foreground/5">
      <div className="absolute inset-0 -z-10">
        <BauhausArt approved={a.approved} />
      </div>
      <div className="p-4 pt-24 sm:p-6 sm:pt-32">
        <div className="rounded-2xl bg-card/95 p-6 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">{ui.score}</p>
            <span
              data-decision={a.approved ? "approved" : "declined"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold",
                a.approved ? "bg-success-soft text-success-foreground" : "bg-danger-soft text-danger-foreground",
              )}
            >
              {a.approved ? <CircleCheck aria-hidden className="size-3.5" /> : <CircleAlert aria-hidden className="size-3.5" />}
              {a.approved ? ui.approved : ui.declined}
            </span>
          </div>

          <p className="mt-2 text-6xl font-extrabold tracking-tight tabular-nums">
            <CountUp value={displayScore(a.score, a.approved)} />
          </p>
          <Scribble color={a.approved ? "var(--chart-3)" : "var(--chart-2)"} />

          <div className="relative mt-5" aria-hidden>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-700 ease-out", a.approved ? "bg-chart-3" : "bg-chart-2")}
                style={{ width: pos(a.score) }}
              />
            </div>
            <div className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-foreground/70" style={{ left: pos(thresholdScore) }} />
          </div>
          <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>300</span>
            <span>900</span>
          </div>

          <dl className="mt-4 divide-y divide-border text-sm">
            <div className="flex justify-between items-center gap-4 py-2.5">
              <dt className="text-muted-foreground">Loan Type</dt>
              <dd className="font-semibold text-foreground flex items-center gap-1.5">
                {loanType === "secured" ? (
                  <>
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>Secured Loan</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-3.5 text-primary" />
                    <span>Unsecured Loan</span>
                  </>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center gap-4 py-2.5">
              <dt className="text-muted-foreground">Loan Amount</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                ₹{(loanAssessment?.loanAmount ?? 500_000).toLocaleString()}
              </dd>
            </div>

            {loanType === "secured" && loanAssessment?.collateralValue && (
              <div className="flex justify-between items-center gap-4 py-2.5">
                <dt className="text-muted-foreground">Collateral Value</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  ₹{loanAssessment.collateralValue.toLocaleString()}
                </dd>
              </div>
            )}

            {loanType === "secured" && loanAssessment?.ltv !== null && loanAssessment?.ltv !== undefined && (
              <div className="flex justify-between items-center gap-4 py-2.5">
                <dt className="text-muted-foreground">Loan-to-Value (LTV)</dt>
                <dd className={cn("font-bold tabular-nums", (loanAssessment.ltv > 80 ? "text-amber-600 dark:text-amber-400" : "text-primary"))}>
                  {loanAssessment.ltv}%
                </dd>
              </div>
            )}

            {loanAssessment?.recentHardInquiries !== undefined && (
              <div className="flex justify-between items-center gap-4 py-2.5">
                <dt className="text-muted-foreground">Hard Inquiries (6M)</dt>
                <dd className="font-semibold tabular-nums text-foreground flex items-center gap-2">
                  <span>{loanAssessment.recentHardInquiries}</span>
                  {loanAssessment.inquiryActivity && (
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      loanAssessment.inquiryActivity.level === "low"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : loanAssessment.inquiryActivity.level === "moderate"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      {loanAssessment.inquiryActivity.label}
                    </span>
                  )}
                </dd>
              </div>
            )}

            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{ui.threshold}</dt>
              <dd className="font-semibold tabular-nums">{thresholdScore}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{ui.pd}</dt>
              <dd className="font-semibold tabular-nums">{pct(a.pd, 1)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{ui.when}</dt>
              <dd className="text-right font-bold text-primary" data-testid="approval-label">
                {approvalLabel}
              </dd>
            </div>
          </dl>

          <div className="mt-3 rounded-xl bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground border border-border/50">
            <span className="font-semibold text-foreground">Assessment Note: </span>
            {loanAssessment?.disclaimer || "For this assessment, loan type, loan amount, and collateral are considered separately from the credit-risk model."}
          </div>

          <ul className="mt-4 grid gap-1 text-sm">
            {[
              { href: "#plan", label: ui.whatTitle, anchor: true },
              { href: reportHref, label: ui.printReport },
              { href: fairnessHref, label: ui.fairness },
            ].map((l) => {
              const cls =
                "group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
              const inner = (
                <>
                  <span>{l.label}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </>
              );
              return (
                <li key={l.href}>
                  {l.anchor ? (
                    <a href={l.href} className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <Link href={l.href} className={cls}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
