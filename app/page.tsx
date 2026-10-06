import { Workbench } from "@/components/Workbench";
import { BusinessModel } from "@/components/home/BusinessModel";
import { asLang } from "@/lib/i18n";
import { isUuid } from "@/lib/security/accountInput";
import { applicantFromParams, type SearchParams } from "@/lib/url";

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { applicant, name, sampleId, loanType, loanAmount, collateralValue, recentHardInquiries } = applicantFromParams(sp);
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const rawPlan = Array.isArray(sp.plan) ? sp.plan[0] : sp.plan;
  // Only the shape is checked here; the API checks the plan belongs to the signed-in person.
  const planId = isUuid(rawPlan) ? rawPlan : null;
  return (
    <>
      <Workbench
        key={`${sampleId ?? "custom"}-${lang}-${planId ?? ""}-${loanType}-${recentHardInquiries}`}
        initialApplicant={applicant}
        initialName={name}
        initialSampleId={sampleId}
        initialLoanType={loanType}
        initialLoanAmount={loanAmount}
        initialCollateralValue={collateralValue}
        initialRecentHardInquiries={recentHardInquiries}
        lang={lang}
        planId={planId}
      />
      <BusinessModel lang={lang} />
    </>
  );
}
