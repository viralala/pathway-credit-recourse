import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export type Tone = "periwinkle" | "mint" | "peach" | "blush" | "butter" | "stone" | "sky";

/** Pastel fill + matching readable text for each decorative tone. */
export const TONE: Record<Tone, string> = {
  periwinkle: "bg-pastel-periwinkle text-deep-periwinkle",
  mint: "bg-pastel-mint text-deep-mint",
  peach: "bg-pastel-peach text-deep-peach",
  blush: "bg-pastel-blush text-deep-blush",
  butter: "bg-pastel-butter text-deep-butter",
  stone: "bg-pastel-stone text-deep-stone",
  sky: "bg-pastel-sky text-deep-sky",
};

/** Small spaced-out label. Letter-spacing is dropped for Devanagari, where it breaks up the script. */
export const KICKER = "text-xs font-bold tracking-[0.16em] uppercase [&:lang(hi)]:tracking-normal [&:lang(mr)]:tracking-normal";

/** Numbered section heading shared by every workbench section. `id` goes on the h2 for aria-labelledby. */
export function SectionHeading({
  id,
  n,
  kicker,
  title,
  sub,
  tone = "periwinkle",
  className,
}: {
  id: string;
  n?: number;
  kicker: string;
  title: string;
  sub?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-8 max-w-3xl sm:mb-10", className)}>
      <div className="flex items-center gap-3">
        {n !== undefined && (
          <span aria-hidden className={cn("grid size-9 place-items-center rounded-full text-sm font-extrabold", TONE[tone])}>
            {n}
          </span>
        )}
        <span className={cn(KICKER, "text-muted-foreground")}>{kicker}</span>
      </div>
      <h2 id={id} className="mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-2 text-base text-pretty text-muted-foreground">{sub}</p>}
    </Reveal>
  );
}
