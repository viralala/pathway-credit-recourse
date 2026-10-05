import { Calculator } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { tf } from "@/lib/i18n";
import { OFFER_THRESHOLDS, formatRate } from "@/lib/offer";
import { PRICING } from "@/lib/pricing";
import type { OfferStrings } from "@/lib/strings/offer";

/** Formulas are language-neutral; the sentences around them are translated. */
const FORMULA = {
  rate: "R = Σ Pᵢ ÷ (1 + r)^tᵢ",
  apr: "APR = r × 365",
  ear: "EAR = (1 + r)^365 − 1",
  cost: "Cost = Σ Pᵢ − R",
} as const;

/** Collapsible explanation of the maths, the day-count convention and the illustrative thresholds. */
export function HowWeCalculate({ s }: { s: OfferStrings }) {
  const t = OFFER_THRESHOLDS;
  const fair = PRICING.tiers.find((x) => x.id === "fair") ?? PRICING.tiers[PRICING.tiers.length - 1];
  const excellent = PRICING.tiers.find((x) => x.id === "excellent") ?? PRICING.tiers[0];
  const steps: { text: string; formula?: string }[] = [
    { text: s.how.flows },
    { text: s.how.rate, formula: FORMULA.rate },
    { text: s.how.apr, formula: FORMULA.apr },
    { text: s.how.ear, formula: FORMULA.ear },
    { text: s.how.dayCount },
    { text: s.how.cost, formula: FORMULA.cost },
    { text: tf(s.how.compare, { fair: formatRate(fair.apr), excellent: formatRate(excellent.apr) }) },
  ];
  const thresholds = [
    tf(s.how.thresholds.apr, { w: formatRate(t.aprWarning), d: formatRate(t.aprDanger) }),
    tf(s.how.thresholds.deductions, { w: formatRate(t.deductionsWarning), d: formatRate(t.deductionsDanger) }),
    tf(s.how.thresholds.tenure, { n: t.shortTenureDays }),
    tf(s.how.thresholds.frequency, { n: t.monthlyDays }),
    s.how.thresholds.received,
  ];

  return (
    <Accordion type="single" collapsible className="rounded-2xl bg-card px-5 ring-1 ring-foreground/10 sm:px-7">
      <AccordionItem value="how">
        <AccordionTrigger className="items-center py-5 text-base font-semibold hover:no-underline">
          <span className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pastel-stone text-deep-stone">
              <Calculator aria-hidden className="size-4.5" />
            </span>
            {s.howTitle}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-6">
          <ol className="grid gap-4">
            {steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
                <span
                  aria-hidden
                  className="grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums"
                >
                  {i + 1}
                </span>
                {/* divs, not <p>: AccordionContent adds bottom margins to nested paragraphs */}
                <div className="min-w-0">
                  <div className="leading-relaxed text-muted-foreground">{step.text}</div>
                  {step.formula && (
                    <div className="mt-1.5 overflow-x-auto">
                      <code lang="en" className="inline-block rounded-lg bg-muted px-2.5 py-1 font-mono text-[13px] whitespace-nowrap text-foreground">
                        {step.formula}
                      </code>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-6 text-sm font-semibold text-foreground">{s.how.thresholdsTitle}</h3>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-muted-foreground marker:text-muted-foreground/60">
            {thresholds.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-4 text-muted-foreground">{s.how.privacy}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
