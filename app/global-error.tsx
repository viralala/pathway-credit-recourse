"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the whole document,
 * so it brings its own <html>/<body> and imports the global styles. Kept minimal on purpose:
 * no header, fonts or providers that could be what failed. English only.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background p-4 font-sans text-foreground antialiased">
        <title>Something went wrong · Pathway</title>
        <main
          role="alert"
          className="w-full max-w-md rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10"
        >
          <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Pathway could not load this page. Please try again, or come back to the home page.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try again
            </button>
            {/* A full page load on purpose: the client router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Go to home
            </a>
          </div>
          {error.digest ? (
            <p className="mt-6 text-xs text-muted-foreground">
              Error reference: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
