# Pathway: deck facts

## Links
- **Live URL:** https://pathway-credit-recourse.vercel.app (verified 2026-10-03: HTTP 200 on all routes; the 3 sample applicants return declined / declined / approved)
- **Repo URL:** https://github.com/viralala/pathway-credit-recourse (public)

## Results (copied from `public/metrics.json`)
| Metric | Value |
|---|---|
| Model AUC (hold-out) | **0.8555** |
| Plan success rate (recommended plans that reach approval) | **100%** (608 of 608 rejected hold-out applicants) |
| Median months to approval (successful plans) | **12 months** |
| Fairness gap (recourse effort, same risk level) | **31.0%** more effort for applicants earning under $3,000/mo than for those earning $6,000+/mo (age gap: 27.6%, ages 18–34 vs. 55+) |

**Data used:** **synthetic**. `data/cs-training.csv` (Kaggle "Give Me Some Credit") was not present, so
`ml/train.py` generated 120,000 synthetic applicants with the same columns (default rate 7.3%),
then trained logistic regression on a 75/25 stratified split. The lender cut-off rejects the riskiest 20%
(PD > 8.27%, Pathway score < 650). Recourse metrics come from running the shipped TypeScript engine on
3,000 held-out applicants (608 rejected). A 100% plan success rate reflects the engine's caps
(36-month horizon, +15% max income growth) on synthetic data. Real data would likely show more infeasible cases.

## Tests
- `npm test` (vitest): **13 tests, 13 passed, 0 failed** (2 test files: model, recourse + timeline)

## Suggested screenshot routes
1. `/?sample=clear-rejection`: declined applicant, score vs. threshold, ranked reason codes
2. `/?sample=borderline#plan`: lowest-effort feasible plan (what changes, what never changes)
3. `/?sample=borderline#timeline`: month-by-month score vs. threshold chart, "Approved in N months"
4. `/fairness`: recourse-effort gap across age and income bands at equal risk
5. `/report?sample=clear-rejection&lang=hi`: printable adverse-action report in Hindi
