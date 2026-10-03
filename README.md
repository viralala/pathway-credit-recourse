# Pathway: explainable loan rejection + path to approval

> A rejection should be a roadmap.

Pathway takes a loan application and does four things:

1. **Explains the decision.** It gives a Pathway score, approve or decline, and ranked reason codes in plain English, Hindi or Marathi.
2. **Finds feasible recourse.** It searches for the lowest-effort set of realistic changes that flips a decline into an approval. It never touches immutable traits.
3. **Projects a timeline.** It simulates the plan month by month and reports "Approved in N months", with a chart of score vs. threshold.
4. **Audits fairness and reports to lenders.** It compares recourse effort across age and income bands at equal risk, and produces a printable adverse-action style report.

Live: https://pathway-credit-recourse.vercel.app · Facts for the pitch deck: [DECK_FACTS.md](DECK_FACTS.md)

> **Disclaimer:** this is a hackathon simulation on public/synthetic data. It is not a credit decision, not financial advice, and not affiliated with any lender.

## Routes

| Route | What it shows |
|---|---|
| `/?sample=clear-rejection` · `borderline` · `approved` | Applicant form, score card, reasons (Why), plan (What), timeline (When) |
| `/report?sample=…&lang=hi` | Printable lender report (EN / HI / MR) |
| `/fairness` | Recourse-effort gap by age and income band, risk-adjusted |
| `/method` | Model, feature classes, coefficients, assumptions, headline metrics |
| `POST /api/explain` | Optional AI rewrite of the explanation (falls back to templates) |

Any applicant can be encoded in the URL (`?income=4200&util=0.6&dti=0.4&age=33&lines=5&l30=1&l60=0&l90=0&dep=1&re=0&lang=mr`).

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest: model, recourse engine, timeline simulator
```

No API key is needed. To try the optional AI rewrite, copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.

## Retraining

```bash
pip install numpy pandas scikit-learn
# optional: put Kaggle's "Give Me Some Credit" cs-training.csv at data/cs-training.csv
python ml/train.py   # or: npm run train
```

`ml/train.py` uses `data/cs-training.csv` if it exists. Otherwise it generates a synthetic dataset with the same columns. It then:

- trains logistic regression (75/25 stratified split) and writes `lib/model.json` (coefficients, scaler, intercept, threshold);
- writes `public/metrics.json` (AUC, data source) and a hold-out sample at `ml/artifacts/eval_sample.json`;
- runs `scripts/evaluate.ts`, which uses the **same TypeScript recourse engine the app ships** to add the plan success rate, median months to approval and the fairness gap to `public/metrics.json`.

`data/` is git-ignored: never commit the Kaggle CSV. If you retrain on Kaggle data, also keep `ml/artifacts/eval_sample.json` out of the repo, since it would contain dataset rows.

## Architecture

```
ml/train.py ──► lib/model.json ──► lib/model.ts      score, PD, reason codes (exact log-odds contributions)
                                   lib/recourse.ts   lowest-effort feasible change set (exhaustive grid, exact scoring)
                lib/config.ts ───► lib/timeline.ts   month-by-month simulator, capped paces
                                   lib/evaluate.ts   plan success, months, risk-adjusted fairness gap
                                   lib/i18n.ts       EN / HI / MR templates
app/ (Next.js App Router) renders it all server-side, with client interactivity for the form and charts (Recharts).
```

**Feature classes** (`lib/config.ts`):

- *Immutable:* age, dependents, real-estate loans. Never changed.
- *Actionable:* card utilization, debt-to-income (via cutting debt payments), open credit lines (±2).
- *Slow-moving:* monthly income (0.6%/month, capped at +15% total), and late payments, which age out of a 24-month window if every future payment is on time.

The plan search scores every candidate exactly with the linear model, minimizes a weighted effort, and breaks ties by time. The timeline moves each change at its capped monthly pace. Tests prove that every recommended plan's target state is approved by the model, and that the simulation reaches approval no later than the plan's completion month.

**Fairness gap:** rejected hold-out applicants are split into Pathway-score risk bands. Each group's mean plan effort is directly standardized to the overall risk-band mix. The gap is the ratio of the highest to the lowest group, minus 1.

## Honest limitations

- **Synthetic by default.** The shipped model was trained on a synthetic replica of the Give Me Some Credit schema because the Kaggle CSV was not present. The AUC and recourse metrics describe that simulation, not real borrowers.
- **The 100% plan success rate comes from the caps** (36-month horizon, generous paydown pace). Real data and stricter assumptions would leave some applicants with no feasible plan, and the UI handles that case.
- **The assumptions are illustrative**, not calibrated to any lender or market. Paydown pace, income growth and effort weights are judgment calls, all visible in `lib/config.ts` and in the UI.
- **The model is simple by design.** Logistic regression makes recourse exact but leaves performance on the table compared with gradient boosting.
- **Causality is assumed.** The plan assumes that changing a feature changes risk the way the model's coefficient says it does.
- **Currency.** Incomes are in the dataset's units ($), not ₹.
- **The report is not legal advice.** It is "adverse-action style" for illustration (Reg B / GDPR Art. 22 / RBI digital lending inspired), not a compliant notice.
- **Translations are templated.** The Hindi and Marathi strings are hand-written templates and would need review by native speakers before real use.

## License

MIT, see [LICENSE](LICENSE).
