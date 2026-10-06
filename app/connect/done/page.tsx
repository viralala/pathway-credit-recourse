import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsentDoneContent, LocalizedConsentDone } from "@/components/connect/ConsentDone";

export const metadata: Metadata = {
  title: "Consent recorded",
  description: "The bank consent window can be closed. Pathway fills in the form in the original tab.",
  alternates: { canonical: "/connect/done" },
  robots: { index: false, follow: false },
};

/**
 * Redirect target of the Account Aggregator approval window (set as the redirect URL in Setu and sent
 * with each consent request by lib/aa/setu.ts). The copy follows `?lang=`; English is the prerendered fallback.
 */
export default function ConsentDonePage() {
  return (
    <Suspense fallback={<ConsentDoneContent lang="en" />}>
      <LocalizedConsentDone />
    </Suspense>
  );
}
