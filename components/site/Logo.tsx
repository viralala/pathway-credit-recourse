import { cn } from "@/lib/utils";

/**
 * Pathway mark: a soft path rising from a starting point (peach, "today") to a destination
 * (mint, "approved") on a periwinkle tile. Decorative; the visible wordmark carries the name.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="10" style={{ fill: "var(--pastel-periwinkle)" }} />
      <path
        d="M8 23.5c4.2 0 5-6.5 9-6.5s4.4-6.2 7.2-7.6"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.1 4.2"
        style={{ stroke: "var(--primary)", opacity: 0.55 }}
      />
      <path
        d="M8 23.5c4.2 0 5-6.5 9-6.5"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        style={{ stroke: "var(--primary)" }}
      />
      <circle cx="8" cy="23.5" r="3" strokeWidth="1.4" style={{ fill: "var(--pastel-peach)", stroke: "var(--deep-peach)" }} />
      <circle cx="24.4" cy="9.2" r="3.6" strokeWidth="1.4" style={{ fill: "var(--pastel-mint)", stroke: "var(--deep-mint)" }} />
      <path
        d="M22.9 9.3l1 1 1.9-2"
        fill="none"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "var(--deep-mint)" }}
      />
    </svg>
  );
}

/** Mark plus visible wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-foreground">Pathway</span>
    </span>
  );
}
