"use client";

import { ArrowRight, Compass, ListChecks, Target } from "lucide-react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { withLang } from "./nav";
import { useLang } from "./use-lang";

/** Friendly 404 body. `lang` drives the copy; links keep `?lang=`. */
export function NotFoundContent({ lang }: { lang: Lang }) {
  const s = shell(lang);
  const n = s.notFound;
  const links = [
    { href: "/check", label: s.nav.check, hint: n.checkHint, Icon: ListChecks, tone: "bg-pastel-teal text-deep-teal" },
    { href: "/goal", label: s.nav.goal, hint: n.goalHint, Icon: Target, tone: "bg-pastel-mint text-deep-mint" },
    { href: "/offer-check", label: s.nav.offerCheck, hint: n.offerHint, Icon: Compass, tone: "bg-pastel-peach text-deep-peach" },
  ];

  return (
    <div lang={lang} className="page-container py-16 sm:py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <LostPathIllustration />
        <p className="mt-8 inline-flex rounded-md bg-pastel-stone px-3 py-1 text-xs font-bold text-deep-stone">
          {n.code}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          {n.title}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">{n.body}</p>
      </div>

      <section aria-labelledby="not-found-suggestions" className="mx-auto mt-12 max-w-3xl">
        <h2 id="not-found-suggestions" className="text-center text-sm font-semibold text-muted-foreground">
          {n.suggestions}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {links.map(({ href, label, hint, Icon, tone }) => (
            <li key={href}>
              <Link
                href={withLang(href, lang)}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                <span aria-hidden="true" className={`grid size-9 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-4" />
                </span>
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  {label}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Localized from `?lang=`. Mount inside <Suspense fallback={<NotFoundContent lang="en" />}>. */
export function LocalizedNotFound() {
  return <NotFoundContent lang={useLang()} />;
}

/** A dotted path that wanders off a tile and stops at a question-mark signpost. Decorative. */
function LostPathIllustration() {
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" aria-hidden="true" focusable="false" className="max-w-full">
      <rect x="6" y="10" width="208" height="124" rx="28" style={{ fill: "var(--pastel-sky)" }} />
      <circle cx="192" cy="34" r="12" style={{ fill: "var(--pastel-butter)" }} />
      <path
        d="M24 112c26 0 30-30 58-30s30 22 54 22 18-30 40-36"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.1 11"
        style={{ stroke: "var(--deep-sky)", opacity: 0.55 }}
      />
      <circle cx="24" cy="112" r="8" strokeWidth="2.5" style={{ fill: "var(--pastel-peach)", stroke: "var(--deep-peach)" }} />
      <g transform="translate(158 54)">
        <rect x="-2" y="10" width="4" height="40" rx="2" style={{ fill: "var(--deep-sky)", opacity: 0.6 }} />
        <rect x="-22" y="-6" width="44" height="26" rx="8" strokeWidth="2" style={{ fill: "var(--card)", stroke: "var(--deep-sky)" }} />
        <path
          d="M-4.5 2.5a4.5 4.5 0 1 1 6.6 4c-1.4.8-2.1 1.6-2.1 3"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          style={{ stroke: "var(--deep-stone)" }}
        />
        <circle cx="0" cy="14.4" r="1.5" style={{ fill: "var(--deep-stone)" }} />
      </g>
      <path d="M40 30l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" style={{ fill: "var(--pastel-blush)" }} />
      <path d="M118 22l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" style={{ fill: "var(--pastel-stone)" }} />
    </svg>
  );
}
