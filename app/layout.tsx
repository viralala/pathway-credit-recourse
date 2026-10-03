import type { Metadata } from "next";
import { Manrope, Noto_Sans_Devanagari } from "next/font/google";
import { Suspense } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Pathway: explainable loan rejection and path to approval",
  description:
    "Pathway explains a loan rejection in plain language and finds the lowest-effort, feasible plan to approval, with a month-by-month timeline, a fairness audit and a lender report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${deva.variable} antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <Suspense fallback={<div className="h-[72px]" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
