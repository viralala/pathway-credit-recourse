import { Workbench } from "@/components/Workbench";
import { asLang } from "@/lib/i18n";
import { applicantFromParams, type SearchParams } from "@/lib/url";

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { applicant, name, sampleId } = applicantFromParams(sp);
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  return (
    <Workbench
      key={`${sampleId ?? "custom"}-${lang}`}
      initialApplicant={applicant}
      initialName={name}
      initialSampleId={sampleId}
      lang={lang}
    />
  );
}
