"use client";

import { House, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { withLang } from "./nav";
import { useLang } from "./use-lang";

/** Body of app/error.tsx: calm message, "Try again" and "Go to home". */
export function ErrorContent({ lang, digest, onRetry }: { lang: Lang; digest?: string; onRetry: () => void }) {
  const s = shell(lang).error;
  return (
    <div lang={lang} className="page-container py-16 sm:py-24">
      <div
        role="alert"
        className="mx-auto flex max-w-xl flex-col items-center rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10 sm:px-10"
      >
        <TangledPathIllustration />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl">{s.title}</h1>
        <p className="mt-3 max-w-md leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
        <div className="mt-7 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button type="button" size="lg" onClick={onRetry} className="h-10 rounded-xl px-4">
            <RotateCcw aria-hidden="true" />
            {s.retry}
          </Button>
          <Button asChild variant="outline" size="lg" className="h-10 rounded-xl px-4">
            <Link href={withLang("/", lang)}>
              <House aria-hidden="true" />
              {s.home}
            </Link>
          </Button>
        </div>
        {digest ? (
          <p className="mt-6 text-xs text-muted-foreground">
            {s.reference}: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{digest}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Localized from `?lang=`. Mount inside <Suspense fallback={<ErrorContent lang="en" … />}>. */
export function LocalizedErrorContent(props: { digest?: string; onRetry: () => void }) {
  return <ErrorContent lang={useLang()} {...props} />;
}

function TangledPathIllustration() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="112" height="76" rx="22" style={{ fill: "var(--pastel-blush)" }} />
      <path
        d="M22 60c14 0 16-26 32-26 12 0 12 16 2 16s-8-22 10-22c14 0 14 18 32 18"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{ stroke: "var(--deep-blush)", opacity: 0.6 }}
      />
      <circle cx="22" cy="60" r="6" strokeWidth="2" style={{ fill: "var(--pastel-peach)", stroke: "var(--deep-peach)" }} />
      <circle cx="98" cy="46" r="6" strokeWidth="2" style={{ fill: "var(--pastel-mint)", stroke: "var(--deep-mint)" }} />
    </svg>
  );
}
