import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { FooterContent, SiteFooter } from "@/components/SiteFooter";
import { HeaderBar, SiteHeader } from "@/components/SiteHeader";
import { CookieNotice } from "@/components/site/CookieNotice";
import { SkipLink, SkipLinkView } from "@/components/site/SkipLink";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteMetadata, siteViewport } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

/*
 * next/font downloads these at build time and serves them from this origin, so a page load makes
 * no request to Google. The privacy policy says so; keep it true by never swapping these for
 * <link> tags.
 */
// Interface and body text.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
// Tall condensed display face for big headlines.
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: ["400"] });
// Italic serif for short asides.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["italic"], weight: ["400", "500"] });
// Hindi and Marathi.
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
    <html lang="en" className={cn("antialiased", archivo.variable, anton.variable, playfair.variable, deva.variable)}>
      <body className="flex min-h-dvh flex-col">
        <TooltipProvider>
          <Suspense fallback={<SkipLinkView lang="en" />}>
            <SkipLink />
          </Suspense>
          <Suspense fallback={<HeaderBar lang="en" search="" />}>
            <SiteHeader />
          </Suspense>
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Suspense fallback={<FooterContent lang="en" />}>
            <SiteFooter />
          </Suspense>
          <Suspense fallback={null}>
            <CookieNotice />
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
