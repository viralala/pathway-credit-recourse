import type { Metadata } from "next";
import { ANTHROPIC_PRIVACY_URL, STORAGE_ITEMS, VERCEL_PRIVACY_URL, type StorageItem } from "@/components/legal/data";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalTable, type LegalColumn } from "@/components/legal/LegalTable";
import { langFromParams, type LegalSearchParams } from "@/components/legal/links";
import { Callout, Code, ExternalLink, InternalLink, Item, LegalSection, List, P, SubHeading } from "@/components/legal/prose";
import type { TocItem } from "@/components/legal/TableOfContents";
import { ISSUES_URL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Pathway handles your data: Google authentication, Supabase PostgreSQL storage with Row-Level Security, and one-click data deletion.",
  alternates: { canonical: "/privacy" },
};

const TOC: TocItem[] = [
  { id: "summary", label: "Summary" },
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-process", label: "What we process and why" },
  { id: "accounts-and-auth", label: "Accounts and Google Authentication" },
  { id: "database-storage", label: "Database storage and Row-Level Security" },
  { id: "legal-basis", label: "Legal basis and consent" },
  { id: "cookies", label: "Cookies and browser storage" },
  { id: "retention", label: "How long data is kept" },
  { id: "sharing", label: "Who data is shared with" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights & data deletion" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact and grievances" },
];

const STORAGE_COLUMNS: LegalColumn<StorageItem>[] = [
  {
    header: "Name",
    rowHeader: true,
    cell: (s) => (
      <>
        <Code>{s.name}</Code>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{s.kind}</span>
      </>
    ),
  },
  { header: "Purpose", cell: (s) => s.purpose },
  { header: "Category", cell: (s) => s.category },
  { header: "Duration", cell: (s) => s.duration },
];

const strong = "font-semibold text-foreground";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<LegalSearchParams> }) {
  const lang = langFromParams(await searchParams);
  const [consent, cursor] = STORAGE_ITEMS;

  return (
    <LegalPage
      current="/privacy"
      title="Privacy policy"
      summary="How Pathway handles your credit assessment inputs and account. When logged in via Google OAuth, your assessments and recourse plans are securely persisted in Supabase PostgreSQL under strict Row-Level Security."
      toc={TOC}
      lang={lang}
    >
      <LegalSection id="summary" title="Summary">
        <Callout title="Key points" tone="calm">
          <List>
            <Item>
              You can explore Pathway anonymously without an account, or sign in with Google to save assessments and monitor recourse plans.
            </Item>
            <Item>
              When signed in, your assessment data and recourse plans are stored in Supabase PostgreSQL protected by Row-Level Security (RLS) so only you can access your data.
            </Item>
            <Item>
              We request only basic Google profile information (name, email, avatar). We never request access to Google Drive, contacts, or external accounts.
            </Item>
            <Item>
              You have complete control: you can delete individual assessments or permanently purge all account data at any time from the Dashboard.
            </Item>
          </List>
        </Callout>
      </LegalSection>

      <LegalSection id="who-we-are" title="Who we are">
        <P>
          Pathway is an open-source hackathon prototype and educational credit recourse simulation built by the Pathway contributors
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For the processing described here, the Pathway contributors are the data
          fiduciary under India&rsquo;s Digital Personal Data Protection Act, 2023, and the controller under GDPR-style laws. You
          can reach us through the channel in <InternalLink href="#contact">Contact and grievances</InternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="what-we-process" title="What we process and why">
        <SubHeading>Numbers you enter</SubHeading>
        <P>
          The applicant tool asks for monthly income, credit card utilisation, debt-to-income ratio, age, number of open credit
          lines, counts of late payments, number of dependents and number of real-estate loans, plus an optional display name.
        </P>
        <P>
          We use these figures to calculate your simulated Pathway credit score, reason codes, recourse action plans, Monte Carlo
          uncertainty bands, and interest savings estimates.
        </P>

        <Callout title="Your numbers are in the page address" tone="important">
          <P>
            So that results can be shared and bookmarked, the numbers you enter, and the optional display name, are encoded in the
            page&rsquo;s URL (the part after &ldquo;?&rdquo;). As a result they can appear:
          </P>
          <List>
            <Item>in your browser history and bookmarks;</Item>
            <Item>in any link you copy or share, where whoever receives it can read them;</Item>
            <Item>in the standard request logs kept by our hosting provider.</Item>
          </List>
          <P>
            Our referrer policy stops your browser from sending this full address to other websites you open from Pathway; they
            see only our domain name.
          </P>
          <P className="font-semibold">
            Please do not enter your real name or exact figures you consider sensitive. Rounded or example numbers work just as
            well for exploring.
          </P>
        </Callout>

        <SubHeading>Optional AI rewrite</SubHeading>
        <P>
          If you press &ldquo;Rewrite in simpler words (AI)&rdquo; and the site has an Anthropic API key configured, our server
          rebuilds the plain-language summary from your numbers and sends that summary to Anthropic&rsquo;s API to reword it. The
          summary includes the display name and some figures, such as your score and the main reason. We do not store the request
          or the reply. Anthropic processes it under its own{" "}
          <ExternalLink href={ANTHROPIC_PRIVACY_URL}>privacy policy</ExternalLink>. If no key is configured, nothing is sent and
          you see the built-in text.
        </P>

        <SubHeading>Technical data</SubHeading>
        <P>
          Like any website, requests to Pathway pass through our hosting provider, Vercel, which may process request metadata such
          as your IP address, user agent, timestamps and the requested URL (including the part with your numbers) in logs, for
          security and operations. To prevent abuse of the AI rewrite, our server also keeps a short-lived count of requests per
          IP address in memory; it is never written to disk and expires within about a minute.
        </P>

        <SubHeading>What we do not do</SubHeading>
        <List>
          <Item>We use no analytics, advertising or tracking tools, and build no profiles.</Item>
          <Item>We do not sell, rent or trade personal data, or share it for advertising.</Item>
          <Item>
            We make no decisions about you. The Pathway score is a simulation and is not used to decide anything outside this
            page.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="accounts-and-auth" title="Accounts and Google Authentication">
        <P>
          Authentication is powered by Supabase Auth using Google OAuth. When you click &ldquo;Continue with Google&rdquo;,
          we receive your verified Google identifier, name, email address, and profile picture.
        </P>
        <P>
          We do not receive or store your Google password, nor do we request permissions beyond standard OpenID Connect profile info.
        </P>
      </LegalSection>

      <LegalSection id="database-storage" title="Database storage and Row-Level Security">
        <P>
          When signed in, assessments, recourse plans, simulations, pricing results, and recorded outcomes are persisted in Supabase
          PostgreSQL.
        </P>
        <P>
          Every table enforces database-level Row-Level Security (RLS). Database policies verify that <Code>auth.uid() = user_id</Code>,
          preventing any user from reading or modifying another applicant&rsquo;s assessments or simulations.
        </P>
      </LegalSection>

      <LegalSection id="legal-basis" title="Legal basis and consent">
        <P>
          <strong className={strong}>India (Digital Personal Data Protection Act, 2023).</strong> We process the figures you
          voluntarily enter only for the purpose you enter them for, which is showing you results, and with your consent, which
          you give by entering them and pressing the buttons that use them. Optional storage, such as the money-cursor setting,
          is used only after you agree in the cookie banner.
        </P>
        <P>
          <strong className={strong}>EU and UK visitors (GDPR-style laws).</strong> Processing your entries is necessary to
          provide the tool you ask for. Host logs and rate limiting rely on our legitimate interest in keeping the Service secure.
          Optional functional storage relies on your consent.
        </P>
        <P>
          You can withdraw consent at any time, as described in <InternalLink href="#your-rights">Your rights</InternalLink>.
          Withdrawing it does not affect processing that already happened.
        </P>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and browser storage">
        <P>
          Pathway sets one cookie and one browser storage entry, both first-party. There are no analytics, advertising, tracking
          or third-party cookies.
        </P>
        <LegalTable
          caption="Cookies and storage set by Pathway"
          columns={STORAGE_COLUMNS}
          rows={STORAGE_ITEMS}
          rowKey={(s) => s.name}
        />
        <P>
          Your language choice is kept in the page address (<Code>?lang=</Code>), not in a cookie or in storage.
        </P>
        <Callout title="Change your cookie settings" tone="info">
          <P>
            Use <strong className="font-semibold">Cookie settings</strong> in the footer of any page to change or withdraw your
            choice. Withdrawing consent deletes the <Code>{cursor.name}</Code> setting. You can also delete cookies and site data at any time
            in your browser&rsquo;s settings.
          </P>
        </Callout>
      </LegalSection>

      <LegalSection id="retention" title="How long data is kept">
        <List>
          <Item>
            <strong className={strong}>Your entries:</strong> we keep none. They exist in your browser and in any URLs you keep or
            share, until you delete them.
          </Item>
          <Item>
            <strong className={strong}>AI rewrite requests:</strong> not stored by us. Anthropic retains data under its own policy.
          </Item>
          <Item>
            <strong className={strong}>Host logs:</strong> kept by Vercel for the period set out in its{" "}
            <ExternalLink href={VERCEL_PRIVACY_URL}>privacy policy</ExternalLink>, for security and operations.
          </Item>
          <Item>
            <strong className={strong}>Rate-limit counts:</strong> in memory only, cleared within about a minute or when the server
            instance restarts.
          </Item>
          <Item>
            <strong className={strong}>
              <Code>{consent.name}</Code> cookie:
            </strong>{" "}
            {consent.duration}.{" "}
            <strong className={strong}>
              <Code>{cursor.name}</Code>:
            </strong>{" "}
            until you clear site data or withdraw consent.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="sharing" title="Who data is shared with">
        <P>
          We do not sell, rent or trade personal data, and we do not share it for advertising. The only service providers
          (processors) involved are:
        </P>
        <List>
          <Item>
            <strong className={strong}>Vercel</strong>, which hosts the site and keeps request logs (
            <ExternalLink href={VERCEL_PRIVACY_URL}>privacy policy</ExternalLink>);
          </Item>
          <Item>
            <strong className={strong}>Anthropic</strong>, only when the AI rewrite is configured and you press its button (
            <ExternalLink href={ANTHROPIC_PRIVACY_URL}>privacy policy</ExternalLink>).
          </Item>
        </List>
        <P>We would disclose information only if the law required it, and we hold none of your entries to disclose.</P>
      </LegalSection>

      <LegalSection id="international-transfers" title="International transfers">
        <P>
          Vercel and Anthropic may process data on servers outside India, including in the United States, under their own
          safeguards and policies. Request logs, and the summary sent when you use the AI rewrite, may therefore be processed in
          those countries.
        </P>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <List>
          <Item>HTTPS everywhere, with HTTP Strict Transport Security.</Item>
          <Item>
            Security headers, including a Content Security Policy that allows only verified assets, protection against clickjacking,
            strict referrer policies, and disabled dangerous permissions.
          </Item>
          <Item>
            Row-Level Security (RLS) on PostgreSQL tables to ensure user data isolation.
          </Item>
          <Item>
            Server-side Zod validation of all numbers and UUID parameters.
          </Item>
          <Item>Same-origin checks, request size limits, and rate limiting on API endpoints.</Item>
        </List>
        <P>
          No system is perfectly secure. If you find a problem, please report it through the{" "}
          <InternalLink href="#contact">contact channel</InternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights & data deletion">
        <P>Under India&rsquo;s Digital Personal Data Protection Act, 2023, the GDPR, and similar international laws, you have the right to:</P>
        <List>
          <Item>Access all personal assessments, recourse plans, and simulations stored in your account.</Item>
          <Item>Have your data erased completely (&ldquo;Right to be Forgotten&rdquo;).</Item>
          <Item>Withdraw your consent and sign out at any time.</Item>
        </List>
        <SubHeading>How to exercise them</SubHeading>
        <List>
          <Item>
            <strong className={strong}>Erase account data:</strong> Use the &ldquo;Permanently Delete My Data&rdquo; button inside your <InternalLink href="/dashboard">Dashboard</InternalLink> to immediately purge your profile, assessments, recourse plans, simulations, and outcomes from Supabase.
          </Item>
          <Item>
            <strong className={strong}>Delete individual assessments:</strong> Click the trash icon next to any assessment in your Dashboard history.
          </Item>
          <Item>
            <strong className={strong}>Withdraw cookie consent:</strong> Use Cookie settings in the footer.
          </Item>
        </List>
        <P>
          For anything else, such as a question about host logs, use the <InternalLink href="#contact">contact channel</InternalLink>.
          If you are not satisfied with our response, you may approach the Data Protection Board of India under the Act, or your
          local data protection authority.
        </P>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <P>
          Pathway is not directed at anyone under 18, and we do not knowingly process children&rsquo;s personal data. If you are
          under 18, please do not use the Service. If a child has entered personal data, the steps under{" "}
          <InternalLink href="#your-rights">Your rights</InternalLink> remove it from the device; nothing is stored on our side.
        </P>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <P>
          We will update this policy when features or processing change, and change the &ldquo;Last updated&rdquo; date at the
          top. Earlier versions stay visible in the public history of the{" "}
          <ExternalLink href={REPO_URL}>source repository</ExternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="contact" title="Contact and grievances">
        <P>
          Pathway does not publish a personal email address. Questions, requests and grievances go through the project&rsquo;s
          public <ExternalLink href={ISSUES_URL}>GitHub issues</ExternalLink> ({ISSUES_URL.replace("https://", "")}). Please do not
          include personal or financial details in a public issue: describe your request in general terms and a maintainer will
          reply there with next steps.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
