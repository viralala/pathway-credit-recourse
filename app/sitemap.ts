import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Date the listed content last changed in a way worth re-crawling. */
const CONTENT_UPDATED = new Date("2026-10-05T00:00:00.000Z");

/** Pages available in English, Hindi and Marathi via ?lang=. */
const LOCALIZED: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/partners", priority: 0.7, changeFrequency: "monthly" },
  { path: "/goal", priority: 0.8, changeFrequency: "monthly" },
  { path: "/offer-check", priority: 0.8, changeFrequency: "monthly" },
  { path: "/fairness", priority: 0.7, changeFrequency: "monthly" },
  { path: "/report", priority: 0.6, changeFrequency: "monthly" },
  { path: "/method", priority: 0.6, changeFrequency: "monthly" },
];

/** English-only legal pages. */
const LEGAL = ["/terms", "/privacy", "/licenses"];

const abs = (path: string, lang?: string) => `${SITE_URL}${path}${lang ? `?lang=${lang}` : ""}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...LOCALIZED.map(({ path, priority, changeFrequency }) => ({
      url: abs(path),
      lastModified: CONTENT_UPDATED,
      changeFrequency,
      priority,
      alternates: {
        languages: { en: abs(path), hi: abs(path, "hi"), mr: abs(path, "mr"), "x-default": abs(path) },
      },
    })),
    ...LEGAL.map((path) => ({
      url: abs(path),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
