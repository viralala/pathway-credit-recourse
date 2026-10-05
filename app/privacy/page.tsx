import type { Metadata } from "next";
import {
  ANTHROPIC_PRIVACY_URL,
  CONSENT_COOKIE,
  GOOGLE_PRIVACY_URL,
  STORAGE_ITEMS,
  SUPABASE_PRIVACY_URL,
  VERCEL_PRIVACY_URL,
  type StorageItem,
} from "@/components/legal/data";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalTable, type LegalColumn } from "@/components/legal/LegalTable";
import { langFromParams, type LegalSearchParams } from "@/components/legal/links";
import { Callout, Code, ExternalLink, InternalLink, Item, LegalSection, List, P, SubHeading } from "@/components/legal/prose";
import type { TocItem } from "@/components/legal/TableOfContents";
import { ISSUES_URL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Pathway handles what you enter: no tracking, no advertising, accounts only if you choose to sign in with Google, and full export and deletion of anything you save.",
  alternates: { canonical: "/privacy" },
};

const TOC: TocItem[] = [
  { id: "summary", label: "Summary" },
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-process", label: "What we process and why" },
  { id: "legal-basis", label: "Legal basis and consent" },
  { id: "cookies", label: "Cookies and browser storage" },
  { id: "retention", label: "How long data is kept" },
  { id: "sharing", label: "Who data is shared with" },
  { id: "international-transfers", label: "International transfers" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights" },
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

  return (
    <LegalPage
      current="/privacy"
      title="Privacy policy"
      summary="How Pathway handles what you enter. Every tool works without an account. If you choose to sign in with Google, we keep the plans you save until you delete them, and you can download or delete everything at any time."
      toc={TOC}
      lang={lang}
    >
      <LegalSection id="summary" title="Summary">
        <Callout title="Key points" tone="calm">
          <List>
            <Item>No analytics, no advertising and no tracking cookies. We never sell or share personal data for advertising.</Item>
            <Item>
              Without an account, the numbers you enter are processed only to show you results. We do not store them, but they are
              written into the page address, so treat links to your results with care.
            </Item>
            <Item>
              Accounts are optional. If you sign in with Google, we receive your name and email address, and we store the plans
              and monthly updates you choose to save.
            </Item>
            <Item>
              In &ldquo;My plans&rdquo; you can download everything we hold about you, delete any plan, or delete your account and
              all of its data.
            </Item>
            <Item>The optional AI rewrite sends a generated summary to Anthropic, and only when you press its button.</Item>
          </List>
        </Callout>
      </LegalSection>

      <LegalSection id="who-we-are" title="Who we are">
        <P>
          Pathway is an open-source educational simulation built by the Pathway contributors (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          For the processing described here, the Pathway contributors are the data fiduciary under India&rsquo;s Digital Personal
          Data Protection Act, 2023 (DPDP Act), and the controller under GDPR-style laws. You can reach us through the channel in{" "}
          <InternalLink href="#contact">Contact and grievances</InternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="what-we-process" title="What we process and why">
        <SubHeading>Numbers you enter</SubHeading>
        <P>
          The loan check asks for monthly income, credit card utilisation, FOIR (the share of income that goes to EMIs and other
          fixed payments), age, the number of active loans and cards, counts of late payments (DPD), the number of dependants and
          the number of home loans, plus an optional display name. The goal planner and offer check ask for similar figures and
          compute everything in your browser.
        </P>
        <P>We use these figures only to calculate and show your results: the score, reasons, plan, timeline and savings estimates.</P>

        <Callout title="Without an account, your numbers are in the page address" tone="important">
          <P>
            So that results can be shared and bookmarked, the numbers you enter and the optional display name are encoded in the
            page&rsquo;s URL (the part after &ldquo;?&rdquo;). They can therefore appear in your browser history and bookmarks, in
            any link you share, and in the standard request logs kept by our hosting provider. Our referrer policy stops your
            browser from sending this full address to other websites.
          </P>
          <P className="font-semibold">
            Please do not enter your real name or figures you consider sensitive. Rounded or example numbers work just as well.
          </P>
        </Callout>

        <SubHeading>If you sign in with Google</SubHeading>
        <P>Signing in is optional and only needed to save plans. When you sign in, we process:</P>
        <List>
          <Item>
            <strong className={strong}>From Google:</strong> your name, email address, Google account identifier and profile
            picture address, as Google shares them for sign-in. We do not receive your Google password or access your Google
            data such as mail, contacts or files.
          </Item>
          <Item>
            <strong className={strong}>Saved plans:</strong> the plan name, the figures listed above, your language and when you
            saved it.
          </Item>
          <Item>
            <strong className={strong}>Monthly updates:</strong> the figures you record each time you update a plan, the Pathway
            score calculated for them, and the date.
          </Item>
        </List>
        <P>
          We use this only to show you your saved plans and your progress. Each person can read only their own plans: the
          database enforces this for every request.
        </P>

        <SubHeading>Partner enquiries</SubHeading>
        <P>
          If you send an enquiry from the &ldquo;For lenders&rdquo; page, we store your name, organisation, email address, the
          type of organisation and your message, and use them only to reply to you.
        </P>

        <SubHeading>Optional AI rewrite</SubHeading>
        <P>
          If you press &ldquo;Rewrite in simpler words (AI)&rdquo; and the site has an Anthropic API key configured, our server
          rebuilds the plain-language summary from your numbers and sends that summary, which includes the display name and some
          figures, to Anthropic&rsquo;s API to reword it. We do not store the request or the reply. Anthropic processes it under
          its own <ExternalLink href={ANTHROPIC_PRIVACY_URL}>privacy policy</ExternalLink>. If no key is configured, nothing is
          sent.
        </P>

        <SubHeading>Technical data</SubHeading>
        <P>
          Requests pass through our hosting provider, Vercel, which may process request metadata such as your IP address, user
          agent, timestamps and the requested URL in logs, for security and operations. To prevent abuse, our server also keeps
          short-lived counts of requests per IP address in memory; they are never written to disk and expire within minutes.
        </P>

        <SubHeading>What we do not do</SubHeading>
        <List>
          <Item>We use no analytics, advertising or tracking tools, and build no profiles.</Item>
          <Item>We do not sell, rent or trade personal data, or share it for advertising.</Item>
          <Item>
            We make no decisions about you. The Pathway score is a simulation and is not shared with any lender, bank or credit
            bureau.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="legal-basis" title="Legal basis and consent">
        <P>
          <strong className={strong}>India (DPDP Act, 2023).</strong> We process the figures you enter, and the account data you
          choose to create, for the specific purpose you give them for, on the basis of your consent: you give it by entering
          figures, by signing in, by saving a plan or by sending an enquiry. You can withdraw it at any time by deleting a plan or
          your account; withdrawal does not affect processing that already happened.
        </P>
        <P>
          <strong className={strong}>EU and UK visitors (GDPR-style laws).</strong> Processing is necessary to provide the tool
          and account you ask for. Host logs and rate limiting rely on our legitimate interest in keeping the service secure.
        </P>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and browser storage">
        <P>
          Pathway sets only first-party cookies, all strictly necessary. There are no analytics, advertising, tracking or
          third-party cookies, and nothing is kept in browser storage.
        </P>
        <LegalTable caption="Cookies set by Pathway" columns={STORAGE_COLUMNS} rows={STORAGE_ITEMS} rowKey={(s) => s.name} />
        <P>
          The session cookies are marked HttpOnly, so no script on the page can read them. Your language choice is kept in the
          page address (<Code>?lang=</Code>), not in a cookie. You can delete cookies at any time in your browser&rsquo;s
          settings; deleting the session cookies signs you out.
        </P>
      </LegalSection>

      <LegalSection id="retention" title="How long data is kept">
        <List>
          <Item>
            <strong className={strong}>Entries without an account:</strong> we keep none. They exist in your browser and in any
            URLs you keep or share.
          </Item>
          <Item>
            <strong className={strong}>Account, saved plans and updates:</strong> until you delete them. Deleting a plan deletes
            its updates; deleting your account deletes everything linked to it, immediately.
          </Item>
          <Item>
            <strong className={strong}>Partner enquiries:</strong> as long as needed to reply and follow up, and no longer than
            24 months.
          </Item>
          <Item>
            <strong className={strong}>AI rewrite requests:</strong> not stored by us. Anthropic retains data under its own policy.
          </Item>
          <Item>
            <strong className={strong}>Host logs:</strong> kept by Vercel for the period in its{" "}
            <ExternalLink href={VERCEL_PRIVACY_URL}>privacy policy</ExternalLink>.
          </Item>
          <Item>
            <strong className={strong}>
              <Code>{CONSENT_COOKIE}</Code> cookie:
            </strong>{" "}
            180 days.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="sharing" title="Who data is shared with">
        <P>We do not sell, rent or trade personal data. The only service providers (data processors) involved are:</P>
        <List>
          <Item>
            <strong className={strong}>Vercel</strong>, which hosts the site and keeps request logs (
            <ExternalLink href={VERCEL_PRIVACY_URL}>privacy policy</ExternalLink>);
          </Item>
          <Item>
            <strong className={strong}>Supabase</strong>, which runs our database and sign-in service and stores account data,
            saved plans, updates and enquiries (<ExternalLink href={SUPABASE_PRIVACY_URL}>privacy policy</ExternalLink>);
          </Item>
          <Item>
            <strong className={strong}>Google</strong>, only if you choose to sign in with it (
            <ExternalLink href={GOOGLE_PRIVACY_URL}>privacy policy</ExternalLink>);
          </Item>
          <Item>
            <strong className={strong}>Anthropic</strong>, only when the AI rewrite is configured and you press its button (
            <ExternalLink href={ANTHROPIC_PRIVACY_URL}>privacy policy</ExternalLink>).
          </Item>
        </List>
        <P>We would disclose information to authorities only if the law required it.</P>
      </LegalSection>

      <LegalSection id="international-transfers" title="International transfers">
        <P>
          Vercel, Supabase, Google and Anthropic may process data on servers outside India, including in the United States,
          under their own safeguards. Your saved data is stored in the region our Supabase project is hosted in, which may be
          outside India.
        </P>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <List>
          <Item>HTTPS everywhere, with HTTP Strict Transport Security.</Item>
          <Item>
            Security headers, including a Content Security Policy that allows only our own scripts, protection against being
            framed by other sites, a strict referrer policy, and a permissions policy that switches off camera, microphone,
            location and payment features.
          </Item>
          <Item>
            Row level security in the database: every read and write runs as the signed-in person, and each person can reach only
            their own rows. The site never uses a database administrator key.
          </Item>
          <Item>Session cookies that page scripts cannot read, and sign-in return addresses limited to this site.</Item>
          <Item>Server-side validation, same-origin checks, size limits and rate limits on every form and API.</Item>
        </List>
        <P>
          No system is perfectly secure. If you find a problem, please report it through the{" "}
          <InternalLink href="#contact">contact channel</InternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <P>Under the DPDP Act, 2023 you have the right to:</P>
        <List>
          <Item>get a summary of the personal data we process and how we process it;</Item>
          <Item>have personal data corrected, completed, updated or erased;</Item>
          <Item>have your grievances redressed;</Item>
          <Item>nominate another person to exercise your rights if you die or become unable to;</Item>
          <Item>withdraw your consent at any time.</Item>
        </List>
        <P>
          If you are in the EU, the UK or another place with similar laws, you have comparable rights, including access,
          rectification, erasure, portability and the right to complain to your data protection authority.
        </P>
        <SubHeading>How to exercise them</SubHeading>
        <List>
          <Item>
            <strong className={strong}>Access and portability:</strong> &ldquo;Download my data&rdquo; in My plans gives you a
            file with everything stored for your account.
          </Item>
          <Item>
            <strong className={strong}>Correct:</strong> update a plan&rsquo;s figures from My plans.
          </Item>
          <Item>
            <strong className={strong}>Erase and withdraw consent:</strong> delete a plan, or use &ldquo;Delete my account&rdquo;
            in My plans to erase the account and all its data at once. Without an account, clear this site from your browser
            history and delete links you shared.
          </Item>
        </List>
        <P>
          For anything else, use the <InternalLink href="#contact">contact channel</InternalLink>. If you are not satisfied with
          our response, you may approach the Data Protection Board of India under the Act, or your local data protection
          authority.
        </P>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <P>
          Pathway is not directed at anyone under 18, and we do not knowingly process children&rsquo;s personal data. If you are
          under 18, please do not use the service or create an account. If we learn that an account belongs to a child, we will
          delete it.
        </P>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <P>
          We will update this policy when features or processing change, and change the &ldquo;Last updated&rdquo; date at the
          top. Earlier versions stay visible in the public history of the <ExternalLink href={REPO_URL}>source repository</ExternalLink>.
        </P>
      </LegalSection>

      <LegalSection id="contact" title="Contact and grievances">
        <P>
          Questions, requests and grievances go through the project&rsquo;s public{" "}
          <ExternalLink href={ISSUES_URL}>GitHub issues</ExternalLink> ({ISSUES_URL.replace("https://", "")}). Please do not
          include personal or financial details in a public issue: describe your request in general terms and a maintainer will
          reply there with next steps.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
