# Pathway demo script: "Credit GPS"

All numbers below come from `DECK_FACTS.md`. Say "sandbox data" out loud whenever the bank fill is on screen. Pathway is an educational simulation, not a lender decision.

Framing line for the whole demo: a map app does not just say "you are lost". It shows the route. Pathway does that for a declined loan.

Before you start: open the live site (re-verify it shows the version-2 model, since the last check predates it), use the sample applicant from `/check?sample=borderline`, set language to English, and have the Hindi report (`/report?sample=clear-rejection&lang=hi`) in a second tab.

---

## 1. Three-minute script

Total: 3:00. Rehearse to 2:45 so there is slack.

| # | Time | Beat |
|---|---|---|
| 1 | 0:00 to 0:20 | Problem |
| 2 | 0:20 to 0:45 | The answer line and score breakdown |
| 3 | 0:45 to 1:15 | Live what-if sliders |
| 4 | 1:15 to 1:40 | Fill from your bank (sandbox) |
| 5 | 1:40 to 2:15 | Plan, timeline and Monte Carlo band |
| 6 | 2:15 to 2:35 | Offer check |
| 7 | 2:35 to 2:50 | Fairness audit |
| 8 | 2:50 to 3:00 | Close |

### Beat 1: Problem (0:00 to 0:20)
- Click: nothing yet. Stay on the home page.
- Say: "You apply for a loan. The answer is no, with a code and no explanation."
- Say: "Then you do not know what to change or when to try again. Many people go to instant-loan apps with hidden fees."
- Say: "Pathway is a credit GPS. It tells you where you are, why, and the route to yes."

### Beat 2: The answer line and score breakdown (0:20 to 0:45)
- Click: open the declined sample (`/check?sample=clear-rejection`).
- Point at: the score against the 650 threshold, then the ranked reasons.
- Say: "This applicant is declined. The score is below 650."
- Say: "Every reason is the exact contribution of one feature to the score, in points. Not a guess, not a story added afterwards."
- Say: "The model is a Logistic Regression, so this is exact. It runs in the browser in TypeScript. No server call to score."

### Beat 3: Live what-if sliders (0:45 to 1:15)
- Click: drag the card utilization slider down slowly.
- Point at: the decision badge flipping from declined to approved, and the EMI figure dropping.
- Say: "Watch the decision. I lower card utilization and the model flips to approved."
- Say: "The EMI drops too, because a better score gets a lower APR tier. The tiers are illustrative, and the app shows them."
- Tip: stop the slider right after the flip, then nudge back up once so the room sees it flip both ways.

### Beat 4: Fill from your bank (1:15 to 1:40)
- Click: "Fill from your bank", approve the consent step, let the form fill.
- Say: "This uses the Account Aggregator flow. In this demo it is sandbox data. Nothing here is a real bank account."
- Say: "In production this would go through a licensed Account Aggregator such as Setu or Finvu, with the user's consent on every pull, plus a bureau partnership for the credit history fields."
- Say: "The point is that nobody types seven numbers by hand."

### Beat 5: Plan, timeline and Monte Carlo band (1:40 to 2:15)
- Click: scroll to `#plan`, then `#timeline`.
- Point at: the lowest-effort plan, the "not used by the model" note, the month-by-month score line crossing the threshold, the shaded band.
- Say: "The plan is the smallest realistic set of changes. Every plan is scored again by the model, and it only asks for inputs the model uses. Age and dependents are never in it."
- Say: "The timeline shows month by month when the score crosses the line. Late payments age out of a 24-month window."
- Say: "The band is 400 simulated futures per applicant, 10th to 90th percentile. So the answer is a range with honesty, not one promised date."
- Say: "On rejected test applicants, 98.4 percent get a plan the model approves. 65 of 4,035 get none within 36 months, and we say so."

### Beat 6: Offer check (2:15 to 2:35)
- Click: open the offer check, enter an instant-loan offer, read the true APR.
- Say: "While you wait for approval, people take instant loans. Offer check works out the true APR from the cash flows, fees included."
- Say: "It is the number the app's headline rate does not show."

### Beat 7: Fairness audit (2:35 to 2:50)
- Click: open `/fairness`.
- Say: "We checked whether the effort needed to recover is the same for people at the same risk."
- Say: "There is a 10.3 percent gap between income under 60,000 rupees a month and 1.2 lakh plus. We show it instead of hiding it. The audit covers age and income only."

### Beat 8: Close (2:50 to 3:00)
- Click: open the Hindi rejection report tab.
- Say: "Same reasons, in writing, in Hindi. Also Marathi. A rejection should be a roadmap."

---

## 2. Sixty-second version

| Time | Click | Say |
|---|---|---|
| 0:00 to 0:10 | Declined sample | "A loan decline usually comes with no explanation. Pathway is a credit GPS: where you are, why, and the route." |
| 0:10 to 0:25 | Reasons panel | "Score under 650. Each reason is the exact point contribution of one feature from a Logistic Regression." |
| 0:25 to 0:40 | Drag utilization down | "Lower utilization and the decision flips to approved. The EMI drops with it." |
| 0:40 to 0:50 | Plan and timeline | "The plan is scored by the model. The band is 400 simulated futures, so you get a range of months, not a promise." |
| 0:50 to 1:00 | Hindi report | "Reasons in writing, in English, Hindi and Marathi. Educational simulation, built on public data." |

If you have time for one extra line: "The bank fill uses sandbox data in this demo."

---

## 3. Judge Q&A

**1. Your data is Kaggle and American. Does this work in India?**
Not proven. The model is trained on Kaggle's "Give Me Some Credit": 150,000 applicants, 6.68 percent defaults. Its incomes are scaled by 20 into rupees, which is near purchasing-power parity but an assumption. Nothing was tested on Indian or lender data. That is the first thing a pilot with a lender would fix.

**2. Why Logistic Regression and not Gradient Boosting? Is it less accurate?**
Slightly. Gradient Boosting (100 trees) reached 0.8599 test AUC against 0.8550 for the shipped model. That is 0.005 higher. We trained it as a benchmark and never shipped it. With Logistic Regression each reason is an exact contribution, the plan search is exhaustive and exact, and the whole thing runs in the browser as JSON. For a decline explanation, we chose exactness over the last half point of AUC.

**3. Is the model calibrated?**
No, and we say so. Probabilities were not recalibrated. The model understates risk somewhat between 5 and 40 percent. Validation applicants scored 10 to 20 percent defaulted at 17.5 percent. The approve or decline cut-off and the ranking are what we rely on, not the exact probability.

**4. How did you choose the cut-off, and could it be tuned to the test set?**
The cut-off is a predicted default probability of 0.10, chosen on validation rows. Test rows were scored once afterwards to confirm it. At that cut-off, 86.6 percent are approved, 60.3 percent of defaulters are caught on test, and 10.1 percent of good applicants are rejected.

**5. What does the fairness audit actually cover?**
Narrowly. It compares the effort needed to recover across age and income bands at the same risk level. The income gap is 10.3 percent (under 60,000 rupees a month against 1.2 lakh plus) and the age gap is 2.8 percent. It does not cover gender, caste, region, religion or any other group, because that data is not in the set. It is an audit tool, not a certificate of fairness.

**6. Is the recourse plan realistic? Can I really change utilization that fast?**
The plan uses capped monthly paces of change and a 36-month horizon. The paces and APR tiers are illustrative and not calibrated to a lender. The honest claims are: every counted plan was re-scored by the model and approved, 98.4 percent of rejected test applicants have one, and the median is 12 months. 65 have none, and for 617 with no usable income on file we never suggest a raise or a payment cut.

**7. What about RBI rules and Account Aggregator consent?**
The demo uses sandbox data only. A production version would connect through a licensed Account Aggregator, with explicit, purpose-limited, revocable consent for each data pull, and would need a bureau partnership for credit history. We have not applied to anyone. We would not store AA data without a clear legal basis and a stated purpose. Pathway is not a lender and makes no credit decision.

**8. Why is no data stored?**
The scoring model runs in the browser, so the numbers you enter do not need to leave the device to get an answer. The deck-facts position is: no accounts, no database and no saved plans in the core app, and saving is future scope. If an account feature is switched on, it must be opt-in, with deletion on request. Say this plainly if a judge asks whether a database was added in the branch.

**9. Does it work for people with no credit history?**
Not yet. The model needs the seven inputs, and a thin-file borrower has few of them. Income missing or a placeholder income is handled by flags and fallback values, but that is not a thin-file model. Scoring from UPI cash flow is on the roadmap, not built.

**10. What is the business model?**
Free for borrowers. Lenders pay: banks and NBFCs for plain-language reasons on declined applications (which RBI's Fair Practices Code asks lenders to give in writing), a printable rejection letter with a plan, and a fairness audit. Fintechs get the plan inside their own app through an API, which is in development. We have not set prices and we are looking for a first lender or fintech to pilot with.

Extra answers if asked:
- "Is the live site current?" The deployment was last verified before the version-2 model. Re-deploy and re-check before the demo.
- "Do tests pass?" 175 tests in 11 files: 174 passed, 1 skipped. One Monte Carlo timing test can fail on a busy machine and passes alone. Parity: 30,000 test applicants, 0 probability mismatches, 0 decision mismatches between Python and TypeScript.
- "Is the AI rewrite button the model?" No. It only rewrites the wording, and only if an API key is set. Otherwise built-in templates are used. The score and reasons are computed by the model.

---

## 4. Vision slides (roadmap, not built)

None of these exist in the product today. Label every one "Roadmap" on the slide.

1. **Credit GPS re-routing.** When your situation changes (a missed payment, a new loan), the route and months to approval update automatically. Roadmap.
2. **Voice in Hindi and Marathi.** Ask "why was I declined" and hear the reasons spoken. Text exists in both languages today; voice does not. Roadmap.
3. **WhatsApp coach.** Monthly nudges toward the plan, in the user's language, where they already are. Roadmap.
4. **Thin-file scoring from UPI cash flow.** A model for people with no bureau history, using consented Account Aggregator cash flow. Needs Indian data and a partner. Roadmap.
5. **Zero-knowledge eligibility proofs.** Prove "I clear this lender's cut-off" without revealing the underlying numbers. Research direction. Roadmap.
6. **Lender API with automatic counterfactual explanations.** Every decline from a lender's own model returns reasons and a plan through one call. API is in development, pilots come first. Roadmap.

Slide footer for all six: "Not built. Educational simulation today."
