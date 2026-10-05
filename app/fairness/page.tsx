import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Scale, Sigma } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { FairnessPanel } from "@/components/pages/FairnessPanel";
import { PageHero } from "@/components/pages/PageHero";
import { StatTile } from "@/components/pages/StatTile";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ASSUMPTIONS } from "@/lib/config";
import { asLang, tf } from "@/lib/i18n";
import { asDataSource, groupLabel, hrefWithLang, pagesText } from "@/lib/strings/pages";
import type { SearchParams } from "@/lib/url";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = {
  title: "Fairness audit",
  description:
    "At the same risk level, who has to work harder to reach approval? Pathway's recourse effort audit by age and income band.",
};

export default async function FairnessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const s = pagesText(lang);
  const fs = s.fairness;
  const f = metrics.fairness;
  const source = asDataSource(metrics.dataSource);
  const e = ASSUMPTIONS.effort;

  const explain = [
    {
      key: "effort",
      icon: Sigma,
      tone: "bg-pastel-periwinkle text-deep-periwinkle",
      title: fs.explain.effortTitle,
      body: tf(fs.explain.effortBody, {
        util: e.per10ppUtilization,
        debt: e.per10pctDebtPaymentCut,
        lines: e.perOpenLineChange,
        income: e.per5pctIncomeGrowth,
        wait: e.perMonthWaiting,
      }),
    },
    {
      key: "compare",
      icon: Scale,
      tone: "bg-pastel-mint text-deep-mint",
      title: fs.explain.compareTitle,
      body: tf(fs.explain.compareBody, { bands: f.riskBands.map(([lo, hi]) => `${lo}–${hi}`).join(", ") }),
    },
    {
      key: "care",
      icon: Info,
      tone: "bg-pastel-butter text-deep-butter",
      title: fs.explain.careTitle,
      body: tf(fs.explain.careBody, { note: s.dataNote[source] }),
    },
  ];

  return (
    <div lang={lang} className="page-container py-6 sm:py-10">
      <Breadcrumbs items={[{ label: s.crumbs.fairness }]} homeHref={hrefWithLang("/", lang)} homeLabel={s.crumbs.home} />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6">
        <PageHero eyebrow={fs.eyebrow} title={fs.title} tone="periwinkle">
          <p>{fs.methodBody}</p>
        </PageHero>
        <Stagger className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4">
          <StaggerItem>
            <StatTile
              tone="blush"
              label={fs.tiles.headline}
              value={metrics.fairnessGap * 100}
              decimals={1}
              suffix="%"
              sub={tf(fs.tiles.headlineSub, {
                high: groupLabel(lang, f.fairnessGapHighest),
                low: groupLabel(lang, f.fairnessGapLowest),
              })}
            />
          </StaggerItem>
          <StaggerItem>
            <StatTile label={fs.tiles.age} value={(f.ageGapRatio - 1) * 100} decimals={1} suffix="%" sub={fs.tiles.bandSub} />
          </StaggerItem>
          <StaggerItem>
            <StatTile
              label={fs.tiles.income}
              value={(f.incomeGapRatio - 1) * 100}
              decimals={1}
              suffix="%"
              sub={fs.tiles.bandSub}
            />
          </StaggerItem>
          <StaggerItem>
            <StatTile
              tone="butter"
              label={fs.tiles.audited}
              value={metrics.rejectedEvaluated}
              sub={tf(fs.tiles.auditedSub, { source: s.sources[source] })}
            />
          </StaggerItem>
        </Stagger>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal className="h-full">
          <FairnessPanel id="age" lang={lang} title={fs.panels.age} groups={f.age} ratio={f.ageGapRatio} />
        </Reveal>
        <Reveal className="h-full" delay={0.08}>
          <FairnessPanel id="income" lang={lang} title={fs.panels.income} groups={f.income} ratio={f.incomeGapRatio} />
        </Reveal>
      </div>

      <Stagger className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {explain.map((x) => (
          <StaggerItem key={x.key} className="h-full">
            <div className="h-full rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
              <span aria-hidden className={`grid size-10 place-items-center rounded-xl ${x.tone}`}>
                <x.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-bold text-foreground">{x.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{x.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-11 rounded-xl px-5">
          <Link href={hrefWithLang("/method", lang)}>
            {fs.cta.method}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 rounded-xl px-5">
          <Link href={hrefWithLang("/report", lang)}>{fs.cta.report}</Link>
        </Button>
      </Reveal>
    </div>
  );
}
