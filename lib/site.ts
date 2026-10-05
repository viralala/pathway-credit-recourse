import type { Metadata, Viewport } from "next";

/** Public origin of the deployed site. Override with NEXT_PUBLIC_SITE_URL on other deployments. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pathway-credit-recourse.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Pathway";
export const REPO_URL = "https://github.com/viralala/pathway-credit-recourse";
/** Public contact and grievance channel (no personal email is published). */
export const ISSUES_URL = `${REPO_URL}/issues`;

export const SITE_TITLE = "Pathway: why your loan was declined and how to get approved";
export const SITE_TAGLINE = "Loan declined? See why, what to change and when to apply again.";
export const SITE_DESCRIPTION =
  "Find out why a loan was declined, the smallest realistic plan to approval, the month you could apply again and the interest you save in rupees, in English, Hindi and Marathi. Free for borrowers. An educational simulation on synthetic data.";

/** Brand colours used outside CSS (manifest, browser UI, generated images). Mirrors app/globals.css. */
export const BRAND = {
  background: "#f5f1e7",
  foreground: "#0c1418",
  muted: "#4f5d62",
  primary: "#12656f",
  /** Soft teal behind the mark. */
  tile: "#d9ecea",
  peach: "#fde3d4",
  peachDeep: "#84401e",
  mint: "#d7f0e3",
  mintDeep: "#2b6249",
} as const;

/**
 * Root metadata, imported by app/layout.tsx (`export const metadata = siteMetadata`).
 *
 * `alternates.canonical` and `openGraph.url` are "./", which Next.js resolves against each page's
 * own path: "/" on the home page, "/terms" on /terms, and so on. A literal "/" would be inherited by
 * every page and tell search engines that every page is a duplicate of the home page. Pages set
 * only `title` (the template adds " · Pathway") and `description`; Open Graph and Twitter titles
 * and descriptions are filled in from those automatically, and app/opengraph-image.tsx supplies
 * the share image for every route.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "loan rejection",
    "credit decision explanation",
    "explainable AI",
    "loan rejection reasons India",
    "credit score improvement India",
    "FOIR",
    "personal loan EMI",
    "credit recourse",
    "path to loan approval",
    "fairness audit",
    "financial literacy",
    "Hindi",
    "Marathi",
  ],
  authors: [{ name: "Pathway contributors", url: REPO_URL }],
  creator: "Pathway contributors",
  publisher: "Pathway contributors",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "./",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "./" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  category: "finance",
};

/** Root viewport, imported by app/layout.tsx (`export const viewport = siteViewport`). */
export const siteViewport: Viewport = {
  themeColor: BRAND.background,
  colorScheme: "light",
};
