import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Dices, PiggyBank, ReceiptText, Target } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/pages/PageHero";
import { SectionHeading } from "@/components/pages/SectionHeading";
import { StatTile } from "@/components/pages/StatTile";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ASSUMPTIONS, describeAssumptions, describeUncertainty, FEATURE_CLASS, UNCERTAINTY } from "@/lib/config";
import { asLang, money } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import { describePricing, emi, moneySaved, PRICING, scoreForApr, tierFor, totalInterest } from "@/lib/pricing";
import { aprText, hrefWithLang, PAGES, pagesText } from "@/lib/strings/pages";
import type { FeatureClass, FeatureKey, ModelFeatureKey } from "@/lib/types";
import type { SearchParams } from "@/lib/url";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Pathway works: an interpretable credit model, a lowest-effort recourse search, a month-by-month timeline, illustrative risk-based pricing and a Monte Carlo certainty band.",
};

/** "derived" marks the three 0/1 flags the cleaning works out; nobody enters them and no plan changes them. */
const CLASS_STYLE: Record<FeatureClass | "derived", string> = {
  derived: "bg-pastel-lavender text-deep-lavender",
  actionable: "bg-pastel-mint text-deep-mint",
  "slow-moving": "bg-pastel-butter text-deep-butter",
};
const classOf = (key: ModelFeatureKey): FeatureClass | "derived" => (key in FEATURE_CLASS ? FEATURE_CLASS[key as FeatureKey] : "derived");

const ON_THIS_PAGE = [
  { id: "results", label: "Results" },
  { id: "pipeline", label: "Pipeline" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Money saved" },
  { id: "monte-carlo", label: "Monte Carlo" },
  { id: "goal", label: "Goal planner" },
  { id: "offer-check", label: "Offer check" },
];

const ordinal = (p: number) => `${Math.round(p * 100)}th`;

/** A definition list rendered from one of the describe*() helpers, so the page shows the exact config. */
function ConfigList({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={className ?? "space-y-3 text-sm"}>
      {items.map((x) => (
        <div key={x.label}>
          <dt className="font-bold">{x.label}</dt>
          <dd className="text-foreground/80">{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function MethodPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const s = pagesText(lang);
  const L = (href: string) => hrefWithLang(href, lang);
  const en = PAGES.en;

  const steps = [
    {
      t: "Train offline",
      d: "Python cleans Kaggle's Give Me Some Credit data, splits it 60/20/20, fits logistic regression on the training rows and picks the cut-off on the validation rows.",
    },
    {
      t: "Export",
      d: "Coefficients, scaler, intercept, cut-off and cleaning rules go to lib/model.json and lib/model.meta.json. No Python runs in production.",
    },
    {
      t: "Recourse engine",
      d: "TypeScript searches every feasible change set, scores each one with the same cleaning and model, and only returns a plan the model itself approves.",
    },
    { t: "Timeline", d: "A month-by-month simulator moves each change at a capped pace and finds the approval month." },
  ];

  // Money saved: the illustrative tiers priced on the default loan.
  const loan = PRICING.defaultLoan;
  const pricingRows = [
    ...PRICING.tiers.map((t) => ({
      key: t.id,
      name: en.tiers[t.id],
      scores: `${t.minScore}+`,
      apr: t.apr,
    })),
    { key: "declined", name: "Declined: high-cost alternative", scores: `below ${MODEL.thresholdScore}`, apr: PRICING.declinedAlternativeApr },
  ];
  const crossing = moneySaved({ scoreToday: MODEL.thresholdScore - 1, scoreAfter: MODEL.thresholdScore });
  const entryTier = tierFor(MODEL.thresholdScore);

  // Goal planner example: the second-cheapest tier's APR as a target.
  const goalTier = PRICING.tiers[Math.max(0, PRICING.tiers.length - 2)];
  const goalScore = scoreForApr(goalTier.apr);

  const u = UNCERTAINTY;

  return (
    <div className="page-container py-6 sm:py-10">
      <div lang={lang} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Breadcrumbs items={[{ label: s.crumbs.method }]} homeHref={L("/")} homeLabel={s.crumbs.home} />
        {lang !== "en" ? (
          <p className="no-print rounded-full bg-pastel-sky px-3 py-1 text-xs font-semibold text-deep-sky">{s.method.englishOnly}</p>
        ) : null}
      </div>

      <div lang="en" className="mt-5">
        <PageHero eyebrow="How it works" title="An interpretable model, so every reason and every plan is exact." tone="lavender">
          <p>
            Pathway pairs a logistic regression credit model with a search over realistic changes, a month-by-month simulator,
            illustrative risk-based pricing and a Monte Carlo certainty band. Everything below is read from the same code and
            configuration the app runs.
          </p>
        </PageHero>

        <Reveal>
          <nav aria-label="On this page" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {ON_THIS_PAGE.map((x) => (
                <li key={x.id}>
                  <a
                    href={`#${x.id}`}
                    className="inline-flex rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold text-secondary-foreground ring-1 ring-foreground/10 transition-colors hover:bg-secondary"
                  >
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>

        {/* Headline metrics (public/metrics.json) */}
        <section id="results" aria-labelledby="results-title" className="mt-12 scroll-mt-24">
          <SectionHeading id="results-title" eyebrow="Results" title="Headline metrics" />
          <Stagger className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            <StaggerItem>
              <StatTile tone="periwinkle" label="Model AUC, validation" value={metrics.validation.auc} decimals={3} />
            </StaggerItem>
            <StaggerItem>
              <StatTile tone="periwinkle" label="Model AUC, test" value={metrics.test.auc} decimals={3} />
            </StaggerItem>
            <StaggerItem>
              <StatTile tone="mint" label="Rejected applicants with a plan" value={metrics.planSuccessRate * 100} decimals={1} suffix="%" />
            </StaggerItem>
            <StaggerItem>
              <StatTile label="Median months to approval" value={metrics.medianMonthsToApproval} />
            </StaggerItem>
            <StaggerItem>
              <StatTile tone="blush" label="Recourse effort gap" value={metrics.fairnessGap * 100} decimals={1} suffix="%" />
            </StaggerItem>
          </Stagger>
          <p className="mt-3 text-sm text-muted-foreground">
            Data: {metrics.dataNote}. The cut-off was chosen on the validation rows; the test rows were used once, to confirm it.
            At the cut-off the model approves {(metrics.validation.approvalRate * 100).toFixed(1)}% of validation applicants and
            catches {(metrics.validation.recall * 100).toFixed(1)}% of defaulters (test: {(metrics.test.approvalRate * 100).toFixed(1)}%
            and {(metrics.test.recall * 100).toFixed(1)}%). Plan figures: all {metrics.rejectedEvaluated.toLocaleString("en-US")}{" "}
            rejected test applicants, run through the same TypeScript engine the app ships; every plan counted was re-scored by the
            model and approved.
          </p>
        </section>

        {/* Pipeline */}
        <section id="pipeline" aria-labelledby="pipeline-title" className="mt-14 scroll-mt-24">
          <SectionHeading id="pipeline-title" eyebrow="Pipeline" title="From training data to a plan" />
          <Stagger className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((x, i) => (
              <StaggerItem key={x.t} className="h-full">
                <div className="h-full rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-full bg-pastel-peach font-extrabold text-deep-peach"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    <span className="sr-only">Step {i + 1}: </span>
                    {x.t}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Features and assumptions */}
        <section id="features" aria-labelledby="features-title" className="mt-14 scroll-mt-24">
          <SectionHeading id="features-title" eyebrow="Model" title="Features, coefficients and assumptions" />
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Reveal className="h-full">
              <div className="h-full rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
                <h3 className="text-lg font-bold text-foreground">Features and what a plan may do with them</h3>
                <Table className="mt-4 text-xs sm:text-sm">
                  <TableCaption className="sr-only">
                    Model features, how a plan may use each one, and its standardized coefficient.
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Feature</TableHead>
                      <TableHead className="text-muted-foreground">Class</TableHead>
                      <TableHead className="text-right text-muted-foreground">Coefficient</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODEL.features.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="whitespace-normal font-semibold">{f.label}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLASS_STYLE[classOf(f.key)]}`}>
                            {classOf(f.key)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {f.coef >= 0 ? "+" : ""}
                          {f.coef.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-xs text-muted-foreground">
                  Standardized coefficients on the log-odds of serious delinquency; positive means riskier. Income and the three
                  late-payment counts enter as log(1 + value). The three derived features are 0/1 flags worked out from the inputs
                  (a late-payment count reported as code 96/98, no income given, income given as 0 or 1); for an applicant who enters
                  a real income and real counts they are all 0. Age, dependents and real-estate loans are not model inputs.
                </p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay={0.08}>
              <div className="h-full rounded-2xl bg-pastel-lavender p-5 text-deep-lavender sm:p-6">
                <h3 className="text-lg font-bold">Assumptions (lib/config.ts)</h3>
                <ConfigList items={describeAssumptions()} className="mt-4 space-y-3 text-sm" />
                <p className="mt-6 text-sm text-foreground/80">
                  Approval cut-off: a predicted default probability below {(MODEL.threshold * 100).toFixed(0)}% is approved; exactly{" "}
                  {(MODEL.threshold * 100).toFixed(0)}% or above is declined. {(MODEL.threshold * 100).toFixed(0)}% sits at Pathway score{" "}
                  {MODEL.thresholdScore}. The cut-off was chosen on the validation rows, where it declines{" "}
                  {(metrics.validation.rejectionRate * 100).toFixed(1)}% of applicants. Every {MODEL.pointsToDoubleOdds} points doubles
                  the odds of repaying.
                </p>
                <Button asChild className="mt-6 h-10 rounded-xl px-4">
                  <Link href={L("/fairness")}>
                    See the fairness audit
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Money saved: risk-based pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="mt-14 scroll-mt-24">
          <SectionHeading id="pricing-title" eyebrow="Money saved" title="Money saved: risk-based pricing" tag="Illustrative">
            <p>
              Under risk-based pricing, a lower-risk borrower is offered a lower interest rate. Pathway turns a plan&apos;s score gain
              into money by pricing the same loan twice: at today&apos;s score and at the score after the plan. The tiers below were
              chosen for this demo. They are illustrative, not any lender&apos;s pricing, and not an offer of credit.
            </p>
          </SectionHeading>
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Reveal className="h-full">
              <div className="h-full rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <PiggyBank aria-hidden className="size-5 text-deep-mint" />
                  Tiers on the default loan
                </h3>
                <Table className="mt-4 text-xs sm:text-sm">
                  <TableCaption className="text-left text-xs">
                    {money(loan.amount)} over {loan.termMonths} months, computed with emi() and totalInterest() in lib/pricing.ts.
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-normal text-muted-foreground">Tier</TableHead>
                      <TableHead className="whitespace-normal text-muted-foreground">Pathway score</TableHead>
                      <TableHead className="text-right text-muted-foreground">APR</TableHead>
                      <TableHead className="text-right text-muted-foreground">EMI</TableHead>
                      <TableHead className="whitespace-normal text-right text-muted-foreground">Total interest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="whitespace-normal font-semibold">{row.name}</TableCell>
                        <TableCell className="tabular-nums">{row.scores}</TableCell>
                        <TableCell className="text-right tabular-nums">{aprText(row.apr)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(emi(loan.amount, row.apr, loan.termMonths))}/mo
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(totalInterest(loan.amount, row.apr, loan.termMonths))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 border-t border-border pt-5">
                  <h4 className="text-sm font-bold text-foreground">Pricing assumptions (lib/pricing.ts)</h4>
                  <ConfigList items={describePricing()} className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2" />
                </div>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 content-start gap-4">
              <Reveal delay={0.06}>
                <div className="rounded-2xl bg-pastel-periwinkle p-5 text-deep-periwinkle sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Formula</p>
                  <p className="mt-3 font-mono text-lg font-semibold text-foreground sm:text-xl">
                    <span className="sr-only">EMI equals P times r, divided by 1 minus (1 plus r) to the power of minus n.</span>
                    <span aria-hidden>
                      EMI = P·r / (1 − (1 + r)<sup>−n</sup>)
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-foreground/80">
                    P is the amount borrowed, r the monthly rate (APR ÷ 12) and n the number of monthly payments. Interest saved is
                    total interest at today&apos;s rate minus total interest at the after-plan rate, on the same loan.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="rounded-2xl bg-money-soft p-5 text-money-foreground ring-1 ring-money/25 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Worked example</p>
                  <p className="mt-2 text-sm">
                    Crossing the approval line, from declined ({aprText(crossing.todayApr)} APR from a high-cost alternative) to the{" "}
                    {entryTier ? en.tiers[entryTier.id] : "entry"} tier ({aprText(crossing.planApr)} APR), cuts projected interest on
                    the default loan from {money(crossing.todayInterest)} to {money(crossing.planInterest)}:
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{money(crossing.saved)} saved</p>
                  <p className="text-xs">and a monthly payment {money(crossing.emiDrop)} lower. Illustrative.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Monte Carlo */}
        <section id="monte-carlo" aria-labelledby="mc-title" className="mt-14 scroll-mt-24">
          <SectionHeading id="mc-title" eyebrow="Uncertainty" title="How sure is the timeline? Monte Carlo" tag="Simulation" />
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Reveal className="h-full">
              <div className="h-full space-y-3 rounded-2xl bg-card p-5 leading-relaxed text-muted-foreground ring-1 ring-foreground/10 sm:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Dices aria-hidden className="size-5 text-deep-sky" />
                  Many futures, not one
                </h3>
                <p>
                  The month-by-month projection moves every change at its capped pace: one tidy future. Real life is noisier, so
                  Pathway also replays the same plan as {u.runs} simulated futures.
                </p>
                <p>
                  Each future draws its own pace of card paydown and debt reduction and its own income growth (still capped by the
                  plan&apos;s target), and may be hit by an income shock that pauses progress or by a new late payment. The random draws
                  are seeded, so the same applicant always gets the same band and the result is repeatable.
                </p>
                <p>
                  From the approval month of every future, Pathway reports the {ordinal(u.percentiles.low)} percentile as the best
                  case, the median as the likely month and the {ordinal(u.percentiles.high)} percentile as the worst case. The shaded
                  band around the projection spans the {ordinal(u.percentiles.low)} to {ordinal(u.percentiles.high)} percentile of the
                  simulated futures each month. A future that has not reached approval by month {ASSUMPTIONS.horizonMonths} counts as
                  “beyond {ASSUMPTIONS.horizonMonths} months”, and the share of futures approved within the horizon is shown next to
                  the band.
                </p>
                <p className="text-sm">
                  It is a simulation of plausible paths, not a forecast for any individual, and the settings are illustrative.
                </p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay={0.08}>
              <div className="h-full rounded-2xl bg-pastel-sky p-5 text-deep-sky sm:p-6">
                <h3 className="text-lg font-bold">Simulation settings (lib/config.ts)</h3>
                <ConfigList items={describeUncertainty()} className="mt-4 space-y-3 text-sm" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Goal planner and offer check */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal className="h-full">
            <section
              id="goal"
              aria-labelledby="goal-title"
              className="h-full scroll-mt-24 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
            >
              <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-pastel-mint text-deep-mint">
                <Target className="size-5" />
              </span>
              <h2 id="goal-title" className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
                Goal planner
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                <p>
                  Instead of asking “what gets me approved?”, the goal planner starts from the rate you would like. It works backwards
                  from a target APR to the lowest Pathway score whose tier is priced at or below it, then runs the same lowest-effort
                  search the approval plan uses, aimed at that score instead of the cut-off.
                </p>
                <p>
                  For example, a target of {aprText(goalTier.apr)} APR needs a score of at least {goalScore ?? goalTier.minScore}, the{" "}
                  {en.tiers[goalTier.id]} tier in the illustrative pricing above.
                </p>
                <p>
                  It also applies an affordability rule: all monthly instalments together, including the new loan, should stay within{" "}
                  {aprText(PRICING.maxEmiToIncome)} of monthly income (PRICING.maxEmiToIncome), a common lender rule of thumb. When the
                  payment does not fit, the planner also works out the largest amount, or the shortest longer term, that would.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-5 h-10 rounded-xl px-4">
                <Link href={L("/goal")}>
                  Open the goal planner
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </section>
          </Reveal>
          <Reveal className="h-full" delay={0.08}>
            <section
              id="offer-check"
              aria-labelledby="offer-title"
              className="h-full scroll-mt-24 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
            >
              <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-pastel-peach text-deep-peach">
                <ReceiptText className="size-5" />
              </span>
              <h2 id="offer-title" className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
                Offer check
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                <p>
                  Enter the terms of a loan offer and the offer check works out its true cost from the cash flows: the money you
                  actually receive after any upfront fees, against every repayment you make.
                </p>
                <p>
                  The true APR is the internal rate of return (IRR) of those cash flows, solved numerically, and annualised with a
                  simple day-count convention: the daily rate × 365, with monthly instalments counted as 30 days. That puts offers with
                  different repayment schedules on one scale. The effective annual rate, (1 + daily rate)<sup>365</sup> − 1, is shown
                  alongside.
                </p>
                <p>
                  Red-flag thresholds are illustrative. A flag is a prompt to read the terms and ask questions, not a verdict on any
                  lender. The calculation runs entirely in your browser.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-5 h-10 rounded-xl px-4">
                <Link href={L("/offer-check")}>
                  Open the offer check
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </section>
          </Reveal>
        </div>

        <Reveal className="mt-14">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-pastel-periwinkle p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xl font-extrabold tracking-tight text-foreground">At the same risk, who has to work harder?</p>
              <p className="mt-1 text-sm text-foreground/80">
                The fairness audit compares recourse effort across age and income bands, adjusted for risk.
              </p>
            </div>
            <Button asChild size="lg" className="h-11 shrink-0 rounded-xl px-5">
              <Link href={L("/fairness")}>
                See the fairness audit
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
