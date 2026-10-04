"use client";

import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConsent } from "@/lib/consent";
import { shell } from "@/lib/strings/shell";
import { cn } from "@/lib/utils";
import { toggleMoneyCursor, useMoneyCursor } from "./cursor-store";
import { useLang } from "./use-lang";

/**
 * Round on/off switch for the money cursor, fixed bottom-left. Hidden where the cursor cannot
 * run (touch-first devices, reduced motion) and on the server. The choice is kept in memory, and
 * on this device too when functional storage is allowed (see Cookie settings).
 * Uses useSearchParams via useLang: mount inside <Suspense>.
 */
export function CursorToggle() {
  const lang = useLang();
  const s = shell(lang).cursor;
  const { supported, enabled } = useMoneyCursor();
  const { functional } = useConsent();
  if (!supported) return null;

  return (
    <div lang={lang} className="no-print fixed bottom-4 left-4 z-40 print:hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-pressed={enabled}
            aria-label={enabled ? s.on : s.off}
            onClick={toggleMoneyCursor}
            className={cn(
              "relative size-10 rounded-full shadow-[0_2px_8px_-2px_rgb(42_40_56/0.12)] backdrop-blur",
              enabled
                ? "border-money/40 bg-money-soft/95 text-money-foreground hover:bg-money-soft hover:text-money-foreground"
                : "bg-card/95 text-muted-foreground",
            )}
          >
            <Coins aria-hidden="true" className="size-[18px]" />
            {/* Slash drawn over the icon when off, so the state is not shown by colour alone. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute h-0.5 w-6 rotate-[-45deg] rounded-full bg-current ring-2 ring-card transition-[opacity,transform] duration-200",
                enabled ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} lang={lang}>
          <span className="flex max-w-56 flex-col gap-0.5 py-0.5">
            <span className="font-semibold">{enabled ? s.turnOff : s.turnOn}</span>
            <span className="opacity-80">{functional ? s.remembered : s.session}</span>
          </span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
