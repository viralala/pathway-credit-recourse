import { ExternalLink, EyeOff, FileText, Flag, Info, Landmark, LifeBuoy, Phone, RotateCcw, Scale, Wallet, type LucideIcon } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { GUIDANCE_LINKS, GUIDANCE_ORDER, type GuidanceId, type OfferStrings } from "@/lib/strings/offer";
import { cn } from "@/lib/utils";
import { TILE_STYLES } from "./styles";

const ICONS: Record<GuidanceId, LucideIcon> = {
  kfs: FileText,
  regulated: Landmark,
  permissions: EyeOff,
  account: Wallet,
  coolingOff: RotateCcw,
  sachet: Flag,
  cyber: Phone,
  ombudsman: Scale,
};

/** "What you can do": general, non-legal guidance for borrowers in India, with official links. */
export function GuidancePanel({ s }: { s: OfferStrings }) {
  return (
    <section aria-labelledby="offer-guidance-title" className="rounded-xl bg-card p-5 border border-border sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pastel-mint text-deep-mint">
          <LifeBuoy aria-hidden className="size-5" />
        </span>
        <div>
          <h2 id="offer-guidance-title" className="text-xl font-bold tracking-tight">
            {s.doTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{s.doSub}</p>
        </div>
      </div>

      <Stagger className="mt-6 grid gap-3 md:grid-cols-2">
        {GUIDANCE_ORDER.map((id, i) => {
          const Icon = ICONS[id];
          const item = s.do[id];
          const links = GUIDANCE_LINKS[id] ?? [];
          return (
            <StaggerItem key={id} className="flex gap-3 rounded-xl bg-muted/50 p-4">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TILE_STYLES[i % TILE_STYLES.length])}>
                <Icon aria-hidden className="size-4.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                {links.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {links.map((l) =>
                      l.external ? (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {l.label}
                          <ExternalLink aria-hidden className="size-3.5" />
                          <span className="sr-only"> {s.newTab}</span>
                        </a>
                      ) : (
                        <a
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          <Phone aria-hidden className="size-3.5" />
                          {l.label}
                        </a>
                      ),
                    )}
                  </p>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      <p className="mt-5 flex items-start gap-2 text-xs leading-snug text-muted-foreground">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        {s.notLegal}
      </p>
    </section>
  );
}
