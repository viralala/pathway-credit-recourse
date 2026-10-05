import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { withLang } from "@/components/site/nav";
import { SectionHeading } from "@/components/workbench/SectionHeading";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader, GlassFilter, LiquidCard } from "@/components/ui/liquid-glass-card";
import type { Lang } from "@/lib/i18n";
import { homeStrings } from "@/lib/strings/home";

const HREF = { borrowers: "/#hero-title", lenders: "/partners", fintechs: "/partners" } as const;

/**
 * Soft shapes behind the glass cards. The liquid-glass filter bends whatever sits behind a card,
 * so the panel needs some structure for the effect to read. Pastel only, so text on the cards stays
 * dark-on-light in every browser, including those that do not support the filter. Decorative.
 */
function Backdrop() {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 -z-10 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 640">
      <rect width="1200" height="640" style={{ fill: "var(--pastel-periwinkle)" }} />
      <circle cx="180" cy="160" r="170" style={{ fill: "var(--pastel-peach)" }} />
      <circle cx="640" cy="520" r="210" style={{ fill: "var(--pastel-mint)" }} />
      <circle cx="1060" cy="150" r="190" style={{ fill: "var(--pastel-sky)" }} />
      <rect x="0" y="300" width="1200" height="34" style={{ fill: "var(--pastel-butter)" }} />
      <circle cx="420" cy="250" r="90" fill="none" strokeWidth="14" style={{ stroke: "var(--pastel-butter)" }} />
      <circle cx="900" cy="430" r="70" fill="none" strokeWidth="12" style={{ stroke: "var(--pastel-blush)" }} />
    </svg>
  );
}

export function BusinessModel({ lang }: { lang: Lang }) {
  const s = homeStrings(lang).business;
  return (
    <section aria-labelledby="business-title" className="page-container pt-4 pb-20">
      <SectionHeading id="business-title" kicker={s.eyebrow} title={s.title} sub={s.aside} />

      <div className="relative isolate overflow-hidden rounded-3xl p-4 ring-1 ring-foreground/5 sm:p-8">
        <Backdrop />
        <GlassFilter />
        <ul className="grid gap-4 md:grid-cols-3">
          {s.plans.map((p) => (
            <li key={p.id}>
              <LiquidCard className="h-full gap-5 bg-card/55 py-6">
                <CardHeader>
                  <p className="text-sm font-semibold text-muted-foreground">{p.who}</p>
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">{p.price}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="grid gap-2.5 text-sm text-foreground">
                    {p.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild variant={p.id === "borrowers" ? "default" : "outline"} className="h-10 w-full rounded-lg bg-clip-border px-4">
                    <Link href={withLang(HREF[p.id], lang)}>
                      {p.cta}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </CardFooter>
              </LiquidCard>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{s.note}</p>
    </section>
  );
}
