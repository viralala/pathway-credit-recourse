import type { Metadata } from "next";
import { ANTHROPIC_PRIVACY_URL, GOOGLE_PRIVACY_URL, SUPABASE_PRIVACY_URL, VERCEL_PRIVACY_URL } from "@/components/legal/data";
import { LegalPage } from "@/components/legal/LegalPage";
import { hrefWithLang, langFromParams, type LegalSearchParams } from "@/components/legal/links";
import { ExternalLink, InternalLink, Item, LegalSection, List, P } from "@/components/legal/prose";
import type { TocItem } from "@/components/legal/TableOfContents";
import { ISSUES_URL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "The terms for using Pathway, a free educational simulation that explains loan rejections. It does not lend, give financial advice or guarantee any outcome.",
  alternates: { canonical: "/terms" },
};

const TOC: TocItem[] = [
  { id: "acceptance", label: "Accepting these terms" },
  { id: "about", label: "What Pathway is and is not" },
  { id: "no-advice", label: "No advice, no guarantee, no lender relationship" },
  { id: "eligibility", label: "Who may use Pathway" },
  { id: "accounts", label: "Accounts" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "third-party-services", label: "Third-party services" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "changes", label: "Changes to these terms" },
  { id: "governing-law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export default async function TermsPage({ searchParams }: { searchParams: Promise<LegalSearchParams> }) {
  const lang = langFromParams(await searchParams);
  const privacy = hrefWithLang("/privacy", lang);
  const licenses = hrefWithLang("/licenses", lang);

  return (
    <LegalPage
      current="/terms"
      title="Terms and conditions"
      summary="The rules for using Pathway, a free educational simulation. In short: Pathway explains and simulates. It does not lend, advise or guarantee anything."
      toc={TOC}
      lang={lang}
    >
      <LegalSection id="acceptance" title="Accepting these terms">
        <P>
          These terms and conditions (&ldquo;Terms&rdquo;) apply to the Pathway website and everything on it, including the loan
          check, optional accounts and saved plans, the partner enquiry form, the plan and timeline, the offer check, the goal planner, the fairness audit, the lender report and the
          optional AI rewrite (together, the &ldquo;Service&rdquo;). The Service is made available by the Pathway contributors
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;), the people who build the open-source Pathway project.
        </P>
        <P>
          By using the Service you agree to these Terms and acknowledge our <InternalLink href={privacy}>Privacy policy</InternalLink>.
          If you do not agree, please do not use the Service.
        </P>
      </LegalSection>

      <LegalSection id="about" title="What Pathway is and is not">
        <P>
          Pathway is a hackathon prototype and an educational simulation. It shows how a simple, interpretable credit model could
          explain a declined application in plain language, and which changes could, inside the simulation, move an application
          above an illustrative approval cut-off.
        </P>
        <List>
          <Item>
            The credit model is a logistic regression trained on synthetic data that follows the column layout of the Kaggle
            &ldquo;Give Me Some Credit&rdquo; competition dataset. No Kaggle data is included in or redistributed by Pathway.
          </Item>
          <Item>
            The &ldquo;Pathway score&rdquo; comes from that model only. It is not a credit score from any credit bureau or credit
            information company, and it will differ from any real score about you.
          </Item>
          <Item>
            Plans, timelines, ranges, interest rates and money-saved figures are illustrative outputs of the simulation, based on
            assumptions shown on the site. They are not offers, quotes or predictions about you.
          </Item>
        </List>
        <P>
          Pathway is not a lender, a bank, a non-banking financial company, a credit bureau, a credit information company, a loan
          broker or a financial adviser. It is not affiliated with, endorsed by or acting for any lender.
        </P>
      </LegalSection>

      <LegalSection id="no-advice" title="No advice, no guarantee, no lender relationship">
        <List>
          <Item>
            <strong className="font-semibold text-foreground">No advice.</strong> Nothing on the Service is financial, credit,
            investment, tax or legal advice, and nothing is a recommendation to borrow, repay, open or close any account or
            product. For decisions about your own money, speak to a qualified professional who is registered or licensed where you
            live.
          </Item>
          <Item>
            <strong className="font-semibold text-foreground">No guarantee.</strong> Real lenders use their own data, models and
            policies, and must follow the law. A real decision can differ from anything Pathway shows, and following a plan shown
            here does not guarantee approval, a particular interest rate or any other outcome.
          </Item>
          <Item>
            <strong className="font-semibold text-foreground">No lender relationship.</strong> Using Pathway does not create a
            lender, broker, agent, fiduciary or advisory relationship with anyone. Pathway does not submit applications, contact
            lenders or share what you enter with them.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="eligibility" title="Who may use Pathway">
        <P>
          You must be at least 18 years old and able to enter into a binding contract under the law that applies to you. The
          Service is not directed at children.
        </P>
        <P>
          Please enter only your own figures, or example figures. Do not enter another person&rsquo;s details without their
          permission.
        </P>
      </LegalSection>

      <LegalSection id="accounts" title="Accounts">
        <P>
          Every tool works without an account. If you sign in with Google, you can save plans and record your figures over time.
          You are responsible for activity under your account and for keeping your Google account secure.
        </P>
        <P>
          Accounts are free. We may limit how much one account can store (currently 50 plans and 120 updates per plan) to keep
          the Service available for everyone. You can download your data or delete your account at any time from &ldquo;My
          plans&rdquo;; deletion is immediate and permanent. We may suspend or delete an account that breaks these Terms.
        </P>
        <P>
          Saved scores and projections are the simulation&rsquo;s output for the figures you entered on that date. They are not a
          record from any credit bureau or lender.
        </P>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <P>You agree not to:</P>
        <List>
          <Item>
            scrape, crawl or send automated requests in a way that burdens or degrades the Service (normal search-engine indexing
            that respects robots.txt is welcome);
          </Item>
          <Item>
            probe, scan or test the Service for vulnerabilities, or try to bypass its security measures, rate limits or access
            controls;
          </Item>
          <Item>
            send automated, bulk or abusive requests to the AI rewrite endpoint (<code className="font-mono text-[13px]">/api/explain</code>),
            or try to use it for anything other than rewriting Pathway&rsquo;s own summary;
          </Item>
          <Item>
            use the Service for anything unlawful, fraudulent or deceptive, including presenting a Pathway output as a real credit
            decision or as a document from a lender or credit bureau;
          </Item>
          <Item>interfere with other people&rsquo;s use of the Service, or upload or link to malicious code.</Item>
        </List>
        <P>
          We may limit, rate-limit or block access to protect the Service and the people using it. If you believe you have found
          a security problem, please report it responsibly through the <InternalLink href="#contact">contact channel</InternalLink>{" "}
          (also listed in <code className="font-mono text-[13px]">/.well-known/security.txt</code>) instead of exploiting it, and
          leave personal data out of the report.
        </P>
      </LegalSection>

      <LegalSection id="intellectual-property" title="Intellectual property">
        <List>
          <Item>
            Pathway&rsquo;s source code, including its original illustrations, is released under the MIT License. You may use,
            copy, modify and distribute it under that license. See <InternalLink href={licenses}>Licenses &amp; credits</InternalLink>{" "}
            and the <ExternalLink href={`${REPO_URL}/blob/main/LICENSE`}>LICENSE file in the repository</ExternalLink>.
          </Item>
          <Item>
            Third-party software, fonts and icons are used under their own licenses, listed on{" "}
            <InternalLink href={licenses}>Licenses &amp; credits</InternalLink>.
          </Item>
          <Item>
            Names, logos and trademarks of third parties, such as Anthropic, Vercel and Kaggle, belong to their owners. Mentioning
            them identifies a service or a data source; it does not imply endorsement or affiliation.
          </Item>
          <Item>
            What you enter stays yours. You give us only the limited permission needed to process it to show you results and, if
            you press the AI rewrite button, to send the generated summary to our AI provider as described in the{" "}
            <InternalLink href={privacy}>Privacy policy</InternalLink>.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="third-party-services" title="Third-party services">
        <List>
          <Item>
            <strong className="font-semibold text-foreground">Hosting.</strong> The Service is hosted on Vercel. See{" "}
            <ExternalLink href={VERCEL_PRIVACY_URL}>Vercel&rsquo;s privacy policy</ExternalLink>.
          </Item>
          <Item>
            <strong className="font-semibold text-foreground">Accounts.</strong> Sign-in and saved data are handled by Supabase (
            <ExternalLink href={SUPABASE_PRIVACY_URL}>privacy policy</ExternalLink>), and sign-in uses your Google account (
            <ExternalLink href={GOOGLE_PRIVACY_URL}>Google&rsquo;s privacy policy</ExternalLink>).
          </Item>
          <Item>
            <strong className="font-semibold text-foreground">Optional AI rewrite.</strong> When the site has an Anthropic API key
            configured and you press &ldquo;Rewrite in simpler words (AI)&rdquo;, our server sends a plain-language summary to
            Anthropic&rsquo;s API to reword it. Anthropic&rsquo;s terms and{" "}
            <ExternalLink href={ANTHROPIC_PRIVACY_URL}>privacy policy</ExternalLink> apply to that processing. When no key is
            configured, the button shows the built-in text and nothing is sent.
          </Item>
          <Item>
            <strong className="font-semibold text-foreground">Links.</strong> The Service links to other websites, such as the
            source code on GitHub. We do not control them and are not responsible for their content or practices.
          </Item>
        </List>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers">
        <P>
          The Service is provided free of charge, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent
          permitted by law, we disclaim all warranties, whether express, implied or statutory, including warranties of accuracy,
          completeness, merchantability, fitness for a particular purpose and non-infringement.
        </P>
        <P>
          We do not warrant that the Service or its outputs will be accurate, complete, uninterrupted, secure or error-free. As a
          prototype, the Service may change, pause or be withdrawn at any time without notice.
        </P>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <P>
          To the fullest extent permitted by applicable law, the Pathway contributors are not liable for any indirect, incidental,
          special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, data, credit opportunity or
          goodwill, arising out of or in connection with the Service or any reliance on its outputs, however caused, even if we
          were told such loss was possible.
        </P>
        <P>
          Nothing in these Terms excludes or limits any liability that cannot be excluded or limited under applicable law,
          including your statutory rights as a consumer.
        </P>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <P>
          We may update these Terms, for example when features change. The &ldquo;Last updated&rdquo; date at the top shows the
          current version, and earlier versions stay visible in the public history of the{" "}
          <ExternalLink href={REPO_URL}>source repository</ExternalLink>. If you keep using the Service after a change, the
          updated Terms apply.
        </P>
        <P>
          If any part of these Terms is found unenforceable, the rest stays in effect. Not enforcing a provision is not a waiver of
          it. These Terms and the Privacy policy are the entire agreement between you and us about the Service.
        </P>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing law">
        <P>
          These Terms are governed by the laws of India. Any dispute arising from them or from the Service is subject to the
          jurisdiction of the competent courts in India. If you live elsewhere, the mandatory consumer protections of your
          country may also apply to you.
        </P>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <P>
          Questions, concerns and grievances go through the project&rsquo;s public{" "}
          <ExternalLink href={ISSUES_URL}>GitHub issues</ExternalLink> ({ISSUES_URL.replace("https://", "")}). Please do not post
          personal or financial information in a public issue: describe the problem in general terms and a maintainer will reply
          there.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
