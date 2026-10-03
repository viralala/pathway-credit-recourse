"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LANGS, asLang, t } from "@/lib/i18n";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" fill="var(--indigo)" />
        <path d="M0 30 A15 15 0 0 1 15 15 L15 30 Z" fill="var(--orange)" />
        <circle cx="22" cy="8" r="4.5" fill="var(--cream)" />
        <path d="M15 30 A15 15 0 0 1 30 15 L30 30 Z" fill="var(--red)" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-indigo">Pathway</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const lang = asLang(sp.get("lang"));
  const ui = t(lang);
  const withLang = (href: string, l = lang) => {
    const q = new URLSearchParams(href.includes("?") ? href.split("?")[1] : "");
    if (l !== "en") q.set("lang", l);
    const base = href.split("?")[0];
    return q.toString() ? `${base}?${q}` : base;
  };
  const langHref = (l: string) => {
    const q = new URLSearchParams(sp.toString());
    if (l === "en") q.delete("lang");
    else q.set("lang", l);
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const nav = [
    { href: "/", label: ui.applicant },
    { href: "/fairness", label: ui.fairness },
    { href: `/report${sp.get("sample") ? `?sample=${sp.get("sample")}` : ""}`, label: ui.report },
    { href: "/method", label: ui.method },
  ];

  return (
    <header className="no-print border-b border-brown/10 bg-cream/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={withLang("/")} aria-label="Pathway home">
          <Logo />
        </Link>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto text-sm font-semibold sm:order-none sm:w-auto">
          {nav.map((n) => {
            const active = n.href.split("?")[0] === pathname;
            return (
              <Link
                key={n.href}
                href={withLang(n.href)}
                className={`whitespace-nowrap px-3 py-2 transition-colors ${
                  active ? "bg-indigo text-cream" : "text-brown hover:bg-rose/50"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex border border-indigo/20 text-sm font-bold" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <Link
              key={l.id}
              href={langHref(l.id)}
              lang={l.id}
              aria-current={l.id === lang}
              title={l.label}
              className={`px-3 py-1.5 transition-colors ${l.id === lang ? "bg-orange text-ink" : "text-indigo hover:bg-rose/40"}`}
            >
              {l.native}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
