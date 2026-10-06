"use client";

import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import type { Analysis } from "@/lib/analyze";
import { displayScore, monthsText, splitAt, tf, type Lang } from "@/lib/i18n";
import { nextTier } from "@/lib/pricing";
import { whatIfStrings } from "@/lib/strings/whatif";
import { KICKER } from "./SectionHeading";

/** The answer to "where do I stand?" as one plain paragraph, led by the score. */
export function AnswerHero({ lang, analysis }: { lang: Lang; analysis: Analysis }) {
  const s = whatIfStrings(lang).hero;
  const { assessment, timeline, uncertainty, thresholdScore, horizon } = analysis;
  const shown = displayScore(assessment.score, assessment.approved);

  const [before, after] = splitAt(assessment.approved ? s.approvedAt : s.declinedAt, "score");

  let rest: string;
  if (assessment.approved) {
    const tier = nextTier(assessment.score);
    rest = tier ? tf(s.nextTier, { n: Math.max(1, tier.minScore - shown) }) : s.bestTier;
  } else {
    const away = tf(s.away, { n: Math.max(1, thresholdScore - shown) });
    const month = timeline.approvalMonth;
    if (month === null || analysis.plan === null) {
      rest = `${away} ${tf(s.noPlan, { n: horizon })}`;
    } else {
      const { low, high } = uncertainty.months;
      const when = monthsText(lang, month, horizon);
      const spread = low !== null && high !== null && low < high;
      rest = `${away} ${spread ? tf(s.aboutRange, { when, low, high }) : tf(s.about, { when })}`;
    }
  }

  return (
    <section aria-labelledby="answer-title" className="page-container py-10 sm:py-14">
      <Reveal className="rounded-2xl bg-pastel-periwinkle p-6 ring-1 ring-foreground/10 sm:p-10">
        <p className={`${KICKER} text-deep-periwinkle`}>{s.kicker}</p>
        <h2 id="answer-title" className="mt-4 max-w-4xl text-3xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          {before}
          <CountUp value={shown} className="tabular-nums" />
          {after} {rest}
        </h2>
        <p className="mt-5 text-sm text-muted-foreground">{s.foot}</p>
      </Reveal>
    </section>
  );
}
