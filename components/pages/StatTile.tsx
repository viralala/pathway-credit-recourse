import { StatNumber } from "@/components/pages/StatNumber";
import { TRACKED } from "@/components/pages/typography";
import { cn } from "@/lib/utils";

const TONES = {
  card: { box: "bg-card ring-1 ring-foreground/10", label: "text-muted-foreground", value: "text-foreground", sub: "text-muted-foreground" },
  blush: { box: "bg-pastel-blush", label: "text-deep-blush", value: "text-deep-blush", sub: "text-deep-blush" },
  butter: { box: "bg-pastel-butter", label: "text-deep-butter", value: "text-deep-butter", sub: "text-deep-butter" },
  mint: { box: "bg-pastel-mint", label: "text-deep-mint", value: "text-deep-mint", sub: "text-deep-mint" },
  periwinkle: { box: "bg-pastel-periwinkle", label: "text-deep-periwinkle", value: "text-deep-periwinkle", sub: "text-deep-periwinkle" },
  lavender: { box: "bg-pastel-lavender", label: "text-deep-lavender", value: "text-deep-lavender", sub: "text-deep-lavender" },
  peach: { box: "bg-pastel-peach", label: "text-deep-peach", value: "text-deep-peach", sub: "text-deep-peach" },
  sky: { box: "bg-pastel-sky", label: "text-deep-sky", value: "text-deep-sky", sub: "text-deep-sky" },
} as const;

export type StatTone = keyof typeof TONES;

/** One headline number with a label and an optional note. The number counts up when scrolled into view. */
export function StatTile({
  label,
  value,
  decimals = 0,
  prefix,
  suffix,
  sub,
  tone = "card",
  className,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  tone?: StatTone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("flex h-full flex-col justify-between rounded-2xl p-5", t.box, className)}>
      <p className={cn("text-xs font-semibold", TRACKED, t.label)}>{label}</p>
      <p className={cn("mt-4 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl", t.value)}>
        <StatNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
      {sub ? <p className={cn("mt-1 text-xs leading-snug", t.sub)}>{sub}</p> : null}
    </div>
  );
}
