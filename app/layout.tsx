import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import { Suspense } from "react";
import { FooterContent, SiteFooter } from "@/components/SiteFooter";
import { HeaderBar, SiteHeader } from "@/components/SiteHeader";
import { CookieConsent } from "@/components/site/CookieConsent";
import { CursorToggle } from "@/components/site/CursorToggle";
import { MoneyCursor } from "@/components/site/MoneyCursor";
import { SkipLink, SkipLinkView } from "@/components/site/SkipLink";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteMetadata, siteViewport } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = siteMetadata;
export const viewport: Viewport = siteViewport;

/*
 * Shell components that read `?lang=` use useSearchParams, so each sits in its own <Suspense>.
 * Fallbacks render the English shell, so statically prerendered pages still ship a full header,
 * footer and skip link in their HTML; the client then swaps in the visitor's language.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("antialiased", manrope.variable, deva.variable)}>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>
          <TooltipProvider>
            <Suspense fallback={<SkipLinkView lang="en" />}>
              <SkipLink />
            </Suspense>
            <Suspense fallback={null}>
              <CookieConsent />
            </Suspense>
            <Suspense fallback={<HeaderBar lang="en" search="" sample={null} />}>
              <SiteHeader />
            </Suspense>
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <Suspense fallback={<FooterContent lang="en" />}>
              <SiteFooter />
            </Suspense>
            <MoneyCursor />
            <Suspense fallback={null}>
              <CursorToggle />
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
