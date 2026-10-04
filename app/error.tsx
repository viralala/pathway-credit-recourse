"use client"; // Error boundaries must be Client Components.

import { Suspense, useEffect } from "react";
import { ErrorContent, LocalizedErrorContent } from "@/components/site/ErrorContent";

/**
 * Route-level error boundary (inside the root layout, so the header and footer stay).
 * `retry` re-fetches and re-renders the failed segment. Server errors only expose a digest.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Suspense fallback={<ErrorContent lang="en" digest={error.digest} onRetry={retry} />}>
      <LocalizedErrorContent digest={error.digest} onRetry={retry} />
    </Suspense>
  );
}
