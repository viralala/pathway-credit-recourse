import { Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { OfferErrors, OfferField } from "@/lib/offer";
import type { OfferStrings } from "@/lib/strings/offer";
import { CARD } from "./styles";

const ORDER: OfferField[] = ["sanctioned", "processingFee", "otherCharges", "gstPct", "bulletAmount", "bulletDays", "count", "instalment"];

/** Shown instead of results while the offer cannot be analysed yet: says exactly what is missing. */
export function IncompleteCard({ s, errors }: { s: OfferStrings; errors: OfferErrors }) {
  const missing = ORDER.filter((f) => errors[f]);
  return (
    <Card className={CARD}>
      <CardContent className="flex flex-col items-start gap-4 py-4 sm:flex-row">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pastel-periwinkle text-deep-periwinkle">
          <Calculator aria-hidden className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 id="offer-results-title" className="text-lg font-semibold">
            {s.resultsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{s.incomplete}</p>
          {missing.length > 0 && (
            <>
              <p className="mt-3 text-sm font-medium">{s.incompleteList}</p>
              <ul className="mt-1 grid gap-1 text-sm">
                {missing.map((f) => (
                  <li key={f} className="flex flex-wrap gap-x-1.5">
                    <span className="font-medium">{s[f]}:</span>
                    <span className="text-muted-foreground">{s.errors[errors[f]!]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
