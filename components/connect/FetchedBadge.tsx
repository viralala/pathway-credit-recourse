"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Lang } from "@/lib/i18n";
import { connectStrings } from "@/lib/strings/connect";
import { cn } from "@/lib/utils";
import type { FieldSource } from "@/lib/aa/types";

/** Small "From bank / From card / From loan / Not found" tag for a field filled by the bank fetch. The tooltip says exactly where the number came from. */
export function FetchedBadge({ lang, source, className }: { lang: Lang; source: FieldSource; className?: string }) {
  const s = connectStrings(lang).badge;
  const label =
    source.origin === "bank-statement" ? s.bank : source.origin === "credit-card" ? s.card : source.origin === "loan-account" ? s.loan : s.none;
  const found = source.origin !== "not-available";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={found ? "secondary" : "outline"}
          tabIndex={0}
          className={cn("cursor-help rounded-md", !found && "text-muted-foreground", className)}
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{source.detail}</TooltipContent>
    </Tooltip>
  );
}
