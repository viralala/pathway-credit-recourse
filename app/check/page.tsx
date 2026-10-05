import type { Metadata } from "next";
import { Workbench } from "@/components/Workbench";
import { asLang } from "@/lib/i18n";
import { isUuid } from "@/lib/security/accountInput";
import { applicantFromParams, type SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  title: "Check my loan",
  description:
    "Enter the figures from your credit report and see why a loan was declined, the smallest realistic plan to approval, the month you could apply again, and the interest you would save in rupees.",
  alternates: { canonical: "/check" },
};

export default async function CheckPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { applicant, name, sampleId } = applicantFromParams(sp);
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const rawPlan = Array.isArray(sp.plan) ? sp.plan[0] : sp.plan;
  // Only the shape is checked here; the API checks the plan belongs to the signed-in person.
  const planId = isUuid(rawPlan) ? rawPlan : null;
  return (
    <Workbench
      key={`${sampleId ?? "custom"}-${lang}-${planId ?? ""}`}
      initialApplicant={applicant}
      initialName={name}
      initialSampleId={sampleId}
      lang={lang}
      planId={planId}
    />
  );
}
