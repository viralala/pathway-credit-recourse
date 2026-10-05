import type { Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";

/** Site navigation: the header shows the main tools; the footer adds the background pages. */
export type NavKey = "check" | "goal" | "offerCheck" | "partners" | "method" | "fairness" | "report";
export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
}

export function primaryNav(lang: Lang): NavItem[] {
  const n = shell(lang).nav;
  return [
    { key: "check", href: "/check", label: n.check },
    { key: "goal", href: "/goal", label: n.goal },
    { key: "offerCheck", href: "/offer-check", label: n.offerCheck },
    { key: "partners", href: "/partners", label: n.partners },
  ];
}

/** Pages that explain and audit the model, listed in the footer. */
export function backgroundNav(lang: Lang): NavItem[] {
  const n = shell(lang).nav;
  return [
    { key: "method", href: "/method", label: n.method },
    { key: "fairness", href: "/fairness", label: n.fairness },
    { key: "report", href: "/report", label: n.report },
  ];
}

/**
 * Adds `?lang=` to an internal href. English is the default and is left out of the URL.
 * Keeps any existing query and #hash:  withLang("/privacy#cookies", "hi") -> "/privacy?lang=hi#cookies".
 */
export function withLang(href: string, lang: Lang): string {
  const hashAt = href.indexOf("#");
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const rest = hashAt === -1 ? href : href.slice(0, hashAt);
  const qAt = rest.indexOf("?");
  const base = qAt === -1 ? rest : rest.slice(0, qAt);
  const q = new URLSearchParams(qAt === -1 ? "" : rest.slice(qAt + 1));
  if (lang === "en") q.delete("lang");
  else q.set("lang", lang);
  const qs = q.toString();
  return `${base}${qs ? `?${qs}` : ""}${hash}`;
}

/** The current page in another language: keeps every other query param. */
export function switchLangHref(pathname: string, search: string, lang: Lang): string {
  const q = new URLSearchParams(search);
  if (lang === "en") q.delete("lang");
  else q.set("lang", lang);
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** True when `pathname` is the page `href` points at, or a page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  const base = href.split(/[?#]/)[0] || "/";
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}
