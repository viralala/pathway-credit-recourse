import type { Metadata } from "next";
import {
  BUILD_SOFTWARE,
  BUNDLED_SOFTWARE,
  FONT_CREDITS,
  ICON_CREDIT,
  KAGGLE_COMPETITION_URL,
  MIT_LICENSE_TEXT,
  RUNTIME_SOFTWARE,
  type AssetCredit,
  type SoftwareCredit,
} from "@/components/legal/data";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalTable, type LegalColumn } from "@/components/legal/LegalTable";
import { langFromParams, type LegalSearchParams } from "@/components/legal/links";
import { Code, ExternalLink, LegalSection, P, SubHeading } from "@/components/legal/prose";
import type { TocItem } from "@/components/legal/TableOfContents";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Licenses & credits",
  description:
    "Pathway's MIT License, and credits for the open-source software, fonts, icons and data schema the project builds on.",
  alternates: { canonical: "/licenses" },
};

const TOC: TocItem[] = [
  { id: "pathway-code", label: "Pathway's own code" },
  { id: "software", label: "Third-party software" },
  { id: "fonts", label: "Fonts" },
  { id: "icons", label: "Icons" },
  { id: "data", label: "Data and model" },
  { id: "illustrations", label: "Illustrations and images" },
  { id: "trademarks", label: "Trademarks" },
];

/** "https://github.com/recharts/recharts" -> "github.com/recharts/recharts" */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const SOFTWARE_COLUMNS: LegalColumn<SoftwareCredit>[] = [
  {
    header: "Package",
    rowHeader: true,
    cell: (p) => (
      <>
        <Code>{p.name}</Code>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{p.usedFor}</span>
      </>
    ),
  },
  { header: "Version", cell: (p) => <span className="tabular-nums">{p.version}</span> },
  { header: "License", cell: (p) => p.license },
  { header: "Homepage", cell: (p) => <ExternalLink href={p.homepage}>{shortUrl(p.homepage)}</ExternalLink> },
];

function AssetList({ items }: { items: AssetCredit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => (
        <li key={a.name} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 print:p-0 print:ring-0">
          <p className="font-semibold text-foreground">{a.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{a.license}</p>
          <p className="mt-2 text-sm leading-6 text-foreground/85 print:text-black">{a.note}</p>
          <p className="mt-2 text-sm">
            <ExternalLink href={a.homepage}>{shortUrl(a.homepage)}</ExternalLink>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function LicensesPage({ searchParams }: { searchParams: Promise<LegalSearchParams> }) {
  const lang = langFromParams(await searchParams);

  return (
    <LegalPage
      current="/licenses"
      title="Licenses & credits"
      summary="The license for Pathway's own code, and credit for the open-source software, fonts, icons and data schema it builds on."
      toc={TOC}
      lang={lang}
    >
      <LegalSection id="pathway-code" title="Pathway's own code">
        <P>
          Pathway&rsquo;s source code is released under the MIT License. The full text, as in the{" "}
          <ExternalLink href={`${REPO_URL}/blob/main/LICENSE`}>LICENSE file of the repository</ExternalLink>, is reproduced
          below.
        </P>
        <pre className="max-w-[80ch] overflow-x-auto rounded-2xl bg-muted/70 p-5 font-mono text-xs leading-6 whitespace-pre-wrap text-foreground ring-1 ring-foreground/10 sm:p-6 sm:text-[13px] print:bg-transparent print:p-0 print:ring-0">
          {MIT_LICENSE_TEXT}
        </pre>
      </LegalSection>

      <LegalSection id="software" title="Third-party software">
        <P>
          Pathway is built on the open-source packages below. Each version and license was checked against the package&rsquo;s
          own <Code>package.json</Code>. Full license texts ship with every package and are available from its homepage or
          repository. These packages bring in their own dependencies, each under its own license, as listed in the
          repository&rsquo;s <Code>package-lock.json</Code>.
        </P>
        <LegalTable
          caption="Runs on our server or in your browser"
          columns={SOFTWARE_COLUMNS}
          rows={RUNTIME_SOFTWARE}
          rowKey={(p) => p.name}
        />
        <LegalTable
          caption="Build and test tools (not sent to your browser)"
          columns={SOFTWARE_COLUMNS}
          rows={BUILD_SOFTWARE}
          rowKey={(p) => p.name}
        />
        <SubHeading>Bundled inside Next.js</SubHeading>
        <P>
          <Code>{BUNDLED_SOFTWARE.name}</Code> {BUNDLED_SOFTWARE.version} ({BUNDLED_SOFTWARE.license}) ships, unmodified,
          inside <Code>next</Code> as <Code>next/og</Code>. It uses Satori and resvg to draw the social preview image and the
          home-screen icon. Source and documentation:{" "}
          <ExternalLink href={BUNDLED_SOFTWARE.homepage}>{shortUrl(BUNDLED_SOFTWARE.homepage)}</ExternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="fonts" title="Fonts">
        <P>All fonts are used under the SIL Open Font License 1.1, which allows free use, bundling and redistribution.</P>
        <AssetList items={FONT_CREDITS} />
      </LegalSection>

      <LegalSection id="icons" title="Icons">
        <AssetList items={[ICON_CREDIT]} />
      </LegalSection>

      <LegalSection id="data" title="Data and model">
        <P>
          The credit model is a logistic regression trained on synthetic data generated to follow the column schema of the{" "}
          <ExternalLink href={KAGGLE_COMPETITION_URL}>&ldquo;Give Me Some Credit&rdquo; competition on Kaggle</ExternalLink>.
          Only the column layout is used: no Kaggle data is included in or redistributed by Pathway. The model&rsquo;s
          coefficients were produced by the project&rsquo;s own training script.
        </P>
        <P>
          Scores, plans, fairness figures and metrics on the site come from this synthetic data. They describe the simulation
          only, not any real population, person or lender.
        </P>
      </LegalSection>

      <LegalSection id="illustrations" title="Illustrations and images">
        <P>
          The illustrations on the site, such as the geometric shapes and the stepping-stone path art, are original SVG artwork
          made for Pathway and are covered by the same MIT License as the code. The social preview image and the app icons are
          drawn by code in the repository.
        </P>
      </LegalSection>

      <LegalSection id="trademarks" title="Trademarks">
        <P>
          &ldquo;Pathway&rdquo; is the name of this open-source project; we claim no registered trademark in it. All other
          product names, logos and brands mentioned on this site, including Next.js, Vercel, React, Anthropic, Claude, Kaggle,
          Google Fonts, GitHub, Radix, Tailwind CSS, shadcn/ui and Lucide, are the property of their respective owners.
        </P>
        <P>They are used only to identify software, services and data sources. This does not imply endorsement or affiliation.</P>
      </LegalSection>
    </LegalPage>
  );
}
