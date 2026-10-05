import { asLang, type Lang } from "@/lib/i18n";

export type LegalSearchParams = Record<string, string | string[] | undefined>;

/** Language the visitor arrived with (?lang=), so links back into the app keep it. */
export function langFromParams(sp: LegalSearchParams): Lang {
  const v = sp.lang;
  return asLang(Array.isArray(v) ? v[0] : v);
}

/** Adds ?lang= (when not English) to an internal href, keeping any #fragment at the end. */
export function hrefWithLang(href: string, lang: Lang): string {
  if (lang === "en") return href;
  const [path, hash] = href.split("#");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}lang=${lang}${hash !== undefined ? `#${hash}` : ""}`;
}

export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms and conditions" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/licenses", label: "Licences and credits" },
] as const;

export type LegalHref = (typeof LEGAL_PAGES)[number]["href"];
