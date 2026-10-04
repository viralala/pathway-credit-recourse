"use client";

import { useSearchParams } from "next/navigation";
import { asLang, type Lang } from "@/lib/i18n";

/**
 * The page language from `?lang=`. Uses useSearchParams, so a component calling it must sit
 * inside a <Suspense> boundary (statically prerendered pages read the query on the client).
 */
export function useLang(): Lang {
  return asLang(useSearchParams().get("lang"));
}
