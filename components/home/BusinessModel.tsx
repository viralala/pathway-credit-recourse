import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { withLang } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader, GlassFilter, LiquidCard } from "@/components/ui/liquid-glass-card";
import type { Lang } from "@/lib/i18n";
import { homeStrings } from "@/lib/strings/home";

const HREF = { borrowers: "/check", lenders: "/partners", fintechs: "/partners" } as const;

/**
 * Soft shapes behind the glass cards. The liquid-glass filter bends whatever sits behind a card,
 * so the panel needs some structure for the effect to read. Pastel only, so text on the cards stays
 * dark-on-light in every browser, including those that do not support the filter. Decorative.
 */
function Backdrop() {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute inset-0 -z-10 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 640">
      <rect width="1200" height="640" style={{ fill: "var(--pastel-stone)" }} />
      <circle cx="180" cy="160" r="170" style={{ fill: "var(--pastel-peach)" }} />
      <circle cx="640" cy="520" r="210" style={{ fill: "var(--pastel-mint)" }} />
      <circle cx="1060" cy="150" r="190" style={{ fill: "var(--pastel-teal)" }} />
      <rect x="0" y="300" width="1200" height="34" style={{ fill: "var(--pastel-butter)" }} />
      <circle cx="420" cy="250" r="90" fill="none" strokeWidth="14" style={{ stroke: "var(--pastel-sky)" }} />
      <circle cx="900" cy="430" r="70" fill="none" strokeWidth="12" style={{ stroke: "var(--pastel-blush)" }} />
    </svg>
  );
}

export function BusinessModel({ lang }: { lang: Lang }) {
  const s = homeStrings(lang).business;
  return (
    <section aria-labelledby="business-title" className="page-container py-16 sm:py-20">
      <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow">{s.eyebrow}</p>
          <h2 id="business-title" className="display mt-3 text-4xl sm:text-5xl">
            {s.title}
          </h2>
        </div>
        <p className="font-serif text-lg leading-snug text-muted-foreground italic lg:col-span-4 lg:col-start-9">{s.aside}</p>
      </div>

      <div className="relative isolate mt-10 overflow-hidden rounded-xl border border-border p-4 sm:p-8">
        <Backdrop />
        <GlassFilter />
        <ul className="grid gap-4 md:grid-cols-3">
          {s.plans.map((p) => (
            <li key={p.id}>
              <LiquidCard className="h-full gap-5 bg-card/55 py-6">
                <CardHeader>
                  <p className="text-sm font-semibold text-muted-foreground">{p.who}</p>
                  <p className="display text-4xl text-foreground">{p.price}</p>
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
                  <Button asChild variant={p.id === "borrowers" ? "default" : "outline"} className="h-10 w-full bg-clip-border px-4">
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
