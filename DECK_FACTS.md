# Pathway: deck facts

Every number below is copied from a file in this repository; the source is named in each section.
Checked on 2026-10-05.

## Links
- **Live URL:** https://pathway-credit-recourse.vercel.app (verified 2026-10-03, before the version-2 Kaggle model: HTTP 200 on all routes; re-verify after the next deploy)
- **Repo URL:** https://github.com/viralala/pathway-credit-recourse (public)

## Dataset facts
Source: `ml/artifacts/split_manifest.json`.
- **Kaggle "Give Me Some Credit"** (`data/cs-training.csv`): **150,000** applicants, **10,026** defaults, default rate **6.68%**.
- Target: serious delinquency (90+ days) within two years.
- Split **60/20/20**, stratified, seed 42: **90,000** training, **30,000** validation, **30,000** test rows.
- No row is deleted in cleaning. Fill values and scaling are learned from the training rows only.

## Model facts
Sources: `ml/artifacts/phase6_training.json`, `lib/model.json`, `lib/model.meta.json`.
- Shipped model: **Logistic Regression** (scikit-learn). Not deep learning.
- **10 features**: 7 inputs (card utilization, three late-payment counts, monthly income, debt ratio, open credit lines) and 3 flags worked out by the cleaning step.
- Age, dependents and real-estate loans are **not used** by the model.
- Benchmark: Gradient Boosting (100 trees), trained for comparison only, **never shipped**.
- Cut-off: predicted default probability of **0.10**. Below 0.10 is approved; 0.10 or above is declined (Pathway score 650). Chosen on validation rows; test rows were scored once to confirm it.
- The model is exported to JSON and runs in TypeScript. No Python runs in the app.

## Evaluation facts
Sources: `ml/artifacts/phase7_evaluation.json`, `ml/artifacts/phase8_cutoff.json` (also in `public/metrics.json`).

| Metric | Validation | Test |
|---|---|---|
| Model AUC | **0.8568** | **0.8550** |
| Benchmark AUC (Gradient Boosting, not shipped) | 0.8608 | 0.8599 |
| Approved at the 10% cut-off | **86.6%** | **86.6%** |
| Defaulters caught (recall) | **59.8%** (1,198 of 2,005) | **60.3%** (1,209 of 2,005) |
| Good applicants rejected | **10.1%** | **10.1%** |
| Rejected applicants who went on to default (precision) | 29.8% | 30.0% |
| Default rate among approved | 3.1% | 3.1% |

- The benchmark's AUC is higher by 0.004 (validation) and 0.005 (test). Do not present the shipped model as the more accurate of the two.

## Application facts
Sources: `lib/config.ts`, `lib/pricing.ts`, `lib/security/validate.ts`, `lib/i18n.ts`.
- Seven inputs, each range-checked on the form, in shared links and in the API.
- Monthly income must be at least **2**: the model reads 0 or 1 as "income not provided", so those are refused as an income.
- A declined score is never displayed as the approval score: 649.6 shows as **649**, not 650.
- Reasons: each is the feature's exact contribution to the score, shown in points.
- Timeline: month-by-month score, with late payments ageing out of a 24-month window.
- Monte Carlo: **400** seeded simulated futures per applicant; the band is the 10th to 90th percentile.
- Goal planner: works back from a loan amount, term and highest acceptable APR to a target score and plan.
- Offer check: true APR of an instant-loan offer from its cash flows, in rupees or dollars.
- Interface languages: **English, Hindi, Marathi**. No others.
- Optional "rewrite in simpler words" button uses an AI model only when an API key is configured; otherwise built-in templates are used.

## Recourse facts
Source: `public/metrics.json` (shipped TypeScript engine run on every rejected test applicant).

| Recourse metric (rejected test applicants) | Value |
|---|---|
| Rejected applicants with a plan the model itself approves | **98.4%** (3,970 of 4,035) |
| No feasible plan within the horizon | **65** of 4,035 |
| Median months to approval (successful plans) | **12 months** |
| Fairness gap (recourse effort, same risk level) | **10.3%** (income: Under ₹60,000/mo vs. ₹1.2 lakh+/mo; income gap 10.3%, age gap 2.8%) |

- Every plan counted was re-scored by the model and approved.
- Plans are limited to a 36-month horizon and capped paces of change.
- 617 of the 4,035 had no usable income on file; for them a raise or a payment cut is never offered.

## Verification facts
Source: commands run on 2026-10-05.
- `npm test` (vitest): **175 tests in 11 files: 174 passed, 0 failed, 1 skipped.** The skipped test compares against a fingerprint of the retired version-1 model. Two tests need `data/parity_test.json` (`python ml/export_parity.py`) and skip without it. One timing test fails intermittently on a busy machine (see caveats).
- `npm run parity`: the TypeScript model matches Python on all **30,000** raw test applicants: **0** probability mismatches (tolerance 0.000001), **0** decision mismatches.
- Typecheck, lint and production build pass.

## Known limitations / caveats
- **Educational simulation.** Not a credit decision, not financial advice, not used by any lender.
- **One public dataset.** Results describe the Kaggle data (its incomes are scaled by 20 into rupees, near purchasing-power parity); nothing was tested on Indian or lender data.
- **Probabilities are not recalibrated.** The model understates risk somewhat between 5% and 40% (validation applicants scored 10–20% defaulted at 17.5%).
- **Illustrative assumptions.** APR tiers, monthly paces of change and Monte Carlo settings are stated in the app but not calibrated to any lender or market, so "money saved" and approval months are illustrations.
- **Not everyone gets a plan.** 65 rejected test applicants have none within 36 months.
- **Fairness audit is narrow.** It compares age and income bands only.
- **Live site is behind.** The deployment was last verified before the version-2 model.
- **One timing test is machine-dependent.** A Monte Carlo speed check (under 50 ms) can fail on a busy machine; it passes when run on its own.
- No accounts, database or saved plans; those are future scope.

## Suggested screenshot routes
1. `/check?sample=clear-rejection`: declined applicant, score vs. threshold, ranked reason codes
2. `/check?sample=borderline#plan`: lowest-effort feasible plan (what changes, what the model does not use)
3. `/check?sample=borderline#timeline`: month-by-month score vs. threshold chart, "Approved in N months"
4. `/fairness`: recourse-effort gap across age and income bands at equal risk
5. `/report?sample=clear-rejection&lang=hi`: printable rejection letter (reasons in writing) in Hindi
