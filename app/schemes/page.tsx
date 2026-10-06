import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { GovernmentSchemesSection } from "@/components/workbench/GovernmentSchemesSection";
import { asLang } from "@/lib/i18n";
import { applicantFromParams, type SearchParams } from "@/lib/url";

export const metadata: Metadata = {
  title: "Government Credit Schemes & Alternative Pathways | Pathway",
  description:
    "Explore verified Indian Central and State credit-linked subsidies, collateral guarantee schemes (PMEGP, MUDRA, CGTMSE, PM Vishwakarma, Stand-Up India), and concessional financing options matching your profile.",
};

export default async function SchemesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const { applicant, name } = applicantFromParams(sp);

  const loanAmount = typeof sp.loanAmount === "string" ? Number(sp.loanAmount) || 500_000 : 500_000;
  const loanType = sp.loanType === "secured" ? "secured" : "unsecured";

  return (
    <div lang={lang} className="page-container pt-5 pb-16 sm:pt-6">
      <Breadcrumbs
        items={[{ label: "Government Schemes" }]}
        homeHref={lang === "en" ? "/" : `/?lang=${lang}`}
        homeLabel="Home"
      />
      <div className="mt-4">
        <GovernmentSchemesSection
          applicant={applicant}
          loanType={loanType}
          loanAmount={loanAmount}
          applicantName={name}
        />
      </div>
    </div>
  );
}
