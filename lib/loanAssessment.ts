import type { Applicant, LoanAssessment, LoanType } from "./types";

export interface LoanAssessmentInput {
  loanType: LoanType;
  loanAmount?: number;
  collateralValue?: number | null;
  applicant: Applicant;
  predictedScore?: number;
  pd?: number;
  decision?: "approved" | "declined";
}

/** Default loan amount used when not explicitly specified */
export const DEFAULT_LOAN_AMOUNT = 500_000;
/** Default collateral value used for secured loan demonstration */
export const DEFAULT_COLLATERAL_VALUE = 800_000;

/**
 * Loan-Type-Specific Backend Assessment Layer.
 *
 * NOTE: The credit score and 2-year default probability (PD) are generated strictly
 * by the core ML model based on borrower financial features.
 *
 * Loan type (secured vs unsecured), Loan Amount, Collateral Value, and LTV
 * are evaluated as a separate contextual assessment layer to reflect collateral backing,
 * loss-given-default (LGD) dynamics, and repayment capacity (FOIR/DTI) without altering
 * the underlying ML credit score mathematics.
 */
export function assessLoan(input: LoanAssessmentInput): LoanAssessment {
  const {
    loanType,
    loanAmount = DEFAULT_LOAN_AMOUNT,
    collateralValue: rawCollateral,
    applicant,
    predictedScore,
    decision,
  } = input;

  const isSecured = loanType === "secured";
  const validLoanAmount = Number.isFinite(loanAmount) && loanAmount > 0 ? loanAmount : DEFAULT_LOAN_AMOUNT;
  
  // Collateral is only valid and retained for secured loans
  const validCollateral =
    isSecured && typeof rawCollateral === "number" && Number.isFinite(rawCollateral) && rawCollateral > 0
      ? rawCollateral
      : isSecured && rawCollateral === undefined
        ? DEFAULT_COLLATERAL_VALUE
        : null;

  // LTV is computed strictly on the backend for secured loans; null for unsecured
  const ltv =
    isSecured && typeof validCollateral === "number" && validCollateral > 0
      ? Number(((validLoanAmount / validCollateral) * 100).toFixed(2))
      : null;

  const foir = Number((applicant.debtRatio * 100).toFixed(1));
  const utilPct = Number((applicant.utilization * 100).toFixed(1));
  const totalLate = applicant.late30 + applicant.late60 + applicant.late90;

  const relevantFactors: string[] = [];
  const assessmentNotes: string[] = [];
  const warnings: string[] = [];

  if (isSecured) {
    relevantFactors.push(`Loan Amount: ₹${validLoanAmount.toLocaleString()}`);
    relevantFactors.push(`Collateral Value: ₹${(validCollateral || 0).toLocaleString()}`);
    if (ltv !== null) {
      relevantFactors.push(`Loan-to-Value (LTV): ${ltv}%`);
    }
    relevantFactors.push(`FOIR / Debt Ratio: ${foir}%`);
    if (applicant.openCreditLines > 0) {
      relevantFactors.push(`Active Credit Lines: ${applicant.openCreditLines}`);
    }

    assessmentNotes.push(
      "Collateral security provides secondary recovery protection, mitigating lender Loss Given Default (LGD)."
    );

    // LTV assessment logic
    if (ltv !== null) {
      if (ltv <= 65) {
        assessmentNotes.push(
          `Healthy Loan-to-Value (LTV) of ${ltv}% provides a strong collateral cushion (>= 35% equity margin).`
        );
      } else if (ltv <= 80) {
        assessmentNotes.push(
          `Standard Loan-to-Value (LTV) of ${ltv}% is within typical institutional risk thresholds (65%–80%).`
        );
      } else if (ltv <= 100) {
        assessmentNotes.push(
          `High Loan-to-Value (LTV) of ${ltv}% leaves a narrow collateral buffer; approval relies heavily on ongoing cash flow.`
        );
      } else {
        warnings.push(
          `LTV of ${ltv}% exceeds 100%. Requested loan amount exceeds pledged collateral value (under-collateralized).`
        );
      }
    }

    if (foir > 50) {
      warnings.push(
        `Debt-to-income ratio (FOIR) is elevated at ${foir}%. Even with collateral backing, debt serviceability is a key check.`
      );
    } else {
      assessmentNotes.push(
        `Debt-to-income ratio of ${foir}% indicates adequate room for secured debt installment serviceability.`
      );
    }

    if (totalLate > 0) {
      assessmentNotes.push(
        `Applicant has ${totalLate} recorded delinquency instance(s). While collateral protects capital recovery, repayment history will be scrutinized.`
      );
    }

    if (predictedScore !== undefined) {
      if (decision === "approved" || predictedScore >= 680) {
        assessmentNotes.push(
          "Strong predicted credit profile paired with collateral security creates a favorable risk profile for secured lending."
        );
      } else {
        assessmentNotes.push(
          "Subprime or borderline credit score indicates higher default likelihood. Collateral security does not substitute for basic repayment capacity."
        );
      }
    }
  } else {
    // Unsecured Loan
    relevantFactors.push(`Loan Amount: ₹${validLoanAmount.toLocaleString()}`);
    relevantFactors.push("Collateral Backing: None (Unsecured)");
    relevantFactors.push(`FOIR / Debt Ratio: ${foir}%`);
    relevantFactors.push(`Revolving Credit Utilization: ${utilPct}%`);
    relevantFactors.push(`Historical Late Payments: ${totalLate}`);

    assessmentNotes.push(
      "No collateral backing exists for this facility; lender exposure relies entirely on borrower ongoing cash flow and repayment willingness."
    );

    if (utilPct > 30) {
      warnings.push(
        `Revolving credit utilization is elevated at ${utilPct}%. For unsecured loans, high utilization indicates potential liquidity strain.`
      );
    } else {
      assessmentNotes.push(
        `Revolving credit utilization is disciplined at ${utilPct}%, supporting unsecured borrowing capacity.`
      );
    }

    if (foir > 45) {
      warnings.push(
        `Debt ratio of ${foir}% leaves limited disposable margin for additional unbacked credit obligations.`
      );
    } else {
      assessmentNotes.push(
        `Debt ratio of ${foir}% indicates adequate unencumbered cash flow buffer for unsecured debt.`
      );
    }

    if (totalLate > 0) {
      warnings.push(
        `Historical late payments (${totalLate} total) represent elevated risk for unsecured underwriting where no recovery collateral is pledged.`
      );
    }

    if (predictedScore !== undefined) {
      if (decision === "approved" || predictedScore >= 680) {
        assessmentNotes.push(
          "Applicant meets baseline unsecured creditworthiness standards with solid credit score and repayment history."
        );
      } else {
        assessmentNotes.push(
          "Credit score below threshold presents high unsecured risk. Recourse actions focused on debt reduction and utilization will strengthen approval odds."
        );
      }
    }
  }

  const riskContext = isSecured
    ? `Secured facility (₹${validLoanAmount.toLocaleString()}) supported by pledged collateral assets (₹${(validCollateral || 0).toLocaleString()}${ltv !== null ? `, LTV: ${ltv}%` : ""}). Risk analysis focuses on collateral enforceability and ongoing cash-flow debt service coverage.`
    : `Unsecured facility (₹${validLoanAmount.toLocaleString()}) with no underlying collateral backing. Risk analysis relies strictly on borrower credit discipline, disposable income, and leverage (FOIR: ${foir}%).`;

  const underwritingFocus = isSecured
    ? "Collateral verification, asset lien priority, LTV ratio, and debt-to-income serviceability."
    : "Cash flow stability, FOIR / debt burden, revolving credit utilization, and historical payment performance.";

  const eligibilityContext = isSecured
    ? (ltv !== null && ltv <= 80 && (decision === "approved" || (predictedScore ?? 0) >= 650))
      ? "Favorable secured loan profile with adequate collateral margin."
      : "Secured loan application requires review of collateral equity margin and debt servicing ratio."
    : (decision === "approved" && foir <= 50)
      ? "Standard unsecured eligibility backed by verified income and credit score."
      : "Unsecured borrowing capacity is restricted by credit score and/or debt burden.";

  const collateralConsideration = isSecured
    ? `Collateral of ₹${(validCollateral || 0).toLocaleString()} (LTV: ${ltv ?? "N/A"}%) reduces lender loss severity in default scenarios, but does not alter the borrower's independent credit risk score.`
    : "No collateral pledged. Full principal recovery is dependent solely on borrower solvency and willingness to repay.";

  return {
    loanType,
    loanTypeLabel: isSecured ? "Secured Loan" : "Unsecured Loan",
    loanAmount: validLoanAmount,
    collateralValue: validCollateral,
    ltv,
    foir,
    collateralBacking: isSecured,
    riskContext,
    underwritingFocus,
    relevantFactors,
    assessmentNotes,
    warnings,
    eligibilityContext,
    collateralConsideration,
    disclaimer: "For this assessment, loan type, loan amount, and collateral are considered separately from the credit-risk model.",
  };
}
