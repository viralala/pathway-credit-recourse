import type { Metadata } from "next";
import { GoalHero } from "@/components/goal/GoalHero";
import { GoalPlanner } from "@/components/goal/GoalPlanner";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { asLang } from "@/lib/i18n";
import { goalStrings } from "@/lib/strings/goal";
import { applicantFromParams, goalFromParams, paramsFor, type SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  title: "Goal planner",
  description:
    "Start from the loan you want: Pathway works out the score that APR needs, the lowest-effort plan to reach it, when you get there and whether the payment fits your budget. Illustrative pricing, not financial advice.",
};

export default async function GoalPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const { applicant, name, sampleId } = applicantFromParams(sp);
  const goal = goalFromParams(sp);
  const s = goalStrings(lang);

  return (
    <div lang={lang} className="page-container pt-5 pb-16 sm:pt-6">
      <Breadcrumbs items={[{ label: s.crumb }]} homeHref={lang === "en" ? "/" : `/?lang=${lang}`} homeLabel={s.home} />
      <div className="mt-4">
        <GoalHero lang={lang} />
      </div>
      <div className="mt-8">
        <GoalPlanner
          // Remount when a link brings a different profile, goal or language (our own URL syncing never changes this).
          key={paramsFor(applicant, { sampleId, lang, goal })}
          initialApplicant={applicant}
          initialName={name}
          initialSampleId={sampleId}
          initialGoal={goal}
          lang={lang}
        />
      </div>
    </div>
  );
}
