import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { GuidancePanel } from "@/components/offer/GuidancePanel";
import { HowWeCalculate } from "@/components/offer/HowWeCalculate";
import { OfferChecker } from "@/components/offer/OfferChecker";
import { OfferHero } from "@/components/offer/OfferHero";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { asLang } from "@/lib/i18n";
import { offerStrings } from "@/lib/strings/offer";

export const metadata: Metadata = {
  title: "Offer check",
  description:
    "See the true yearly cost of an instant-loan offer, including fees taken upfront and short repayment times, with red flags and a comparison with a fair rate. Runs entirely in your browser.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function OfferCheckPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const raw = sp.lang;
  const lang = asLang(Array.isArray(raw) ? raw[0] : raw);
  const s = offerStrings(lang);
  const homeHref = lang === "en" ? "/" : `/?lang=${lang}`;

  return (
    <div lang={lang} className="page-container py-6 sm:py-10">
      <Breadcrumbs items={[{ label: s.crumb }]} homeHref={homeHref} homeLabel={s.home} />

      <div className="mt-5">
        <OfferHero s={s} />
      </div>

      <OfferChecker lang={lang} homeHref={homeHref} />

      <div className="mt-12 grid gap-6">
        <GuidancePanel s={s} />
        <Reveal>
          <HowWeCalculate s={s} />
        </Reveal>
      </div>

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">{s.disclaimer}</p>
    </div>
  );
}
