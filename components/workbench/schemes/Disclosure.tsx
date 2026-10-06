"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A show/hide section the parent can open from code (for example, to reveal a question before focusing it).
 * The panel's content is only mounted while open, and the button says which panel it controls.
 */
export function Disclosure({
  id,
  open,
  onOpenChange,
  label,
  hint,
  heading,
  className,
  buttonClassName,
  children,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: ReactNode;
  /** Small line under the button, visible whether open or closed. */
  hint?: string;
  /** Wrap the button in a heading of this level, so the section shows up in the outline. */
  heading?: "h3" | "h4";
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const Heading = heading ?? "div";
  const panelId = `${id}-panel`;
  return (
    <div className={className}>
      <Heading>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "group flex w-full items-center justify-between gap-3 rounded-xl text-left text-sm font-bold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            buttonClassName,
          )}
        >
          <span>{label}</span>
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </Heading>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div id={panelId} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
