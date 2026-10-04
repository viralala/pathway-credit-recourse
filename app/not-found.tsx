import { Suspense } from "react";
import { LocalizedNotFound, NotFoundContent } from "@/components/site/NotFoundContent";

/**
 * 404 for notFound() calls and every unmatched URL. Renders inside the root layout.
 * The copy follows `?lang=`; the English version is the prerendered fallback.
 */
export default function NotFound() {
  return (
    <Suspense fallback={<NotFoundContent lang="en" />}>
      <LocalizedNotFound />
    </Suspense>
  );
}
