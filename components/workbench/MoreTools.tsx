"use client";

import { ArrowRight, Goal, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import type { UIStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SectionHeading, TONE, type Tone } from "./SectionHeading";

/** Links to the other tools. Hrefs come in already localized (and, for the goal planner, carrying the profile). */
export function MoreTools({
  ui,
  goalHref,
  offerHref,
  fairnessHref,
}: {
  ui: UIStrings;
  goalHref: string;
  offerHref: string;
  fairnessHref: string;
}) {
  const s = ui.tools;
  const tools: { href: string; title: string; body: string; icon: LucideIcon; tone: Tone }[] = [
    { href: goalHref, title: s.goalTitle, body: s.goalBody, icon: Goal, tone: "peach" },
    { href: offerHref, title: s.offerTitle, body: s.offerBody, icon: ShieldCheck, tone: "sky" },
    { href: fairnessHref, title: ui.fairness, body: s.fairnessBody, icon: Scale, tone: "mint" },
  ];

  return (
    <section aria-labelledby="tools-title" className="page-container pt-4 pb-20">
      <SectionHeading id="tools-title" kicker={s.kicker} title={s.title} sub={s.sub} />
      <Stagger>
        <ul className="grid gap-4 md:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <li key={tool.title}>
                <StaggerItem className="h-full">
                  <Link
                    href={tool.href}
                    className="group flex h-full flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10 transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    <span aria-hidden className={cn("grid size-12 place-items-center rounded-2xl", TONE[tool.tone])}>
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-extrabold tracking-tight text-foreground">{tool.title}</h3>
                    <p className="mt-1.5 flex-1 text-sm text-pretty text-muted-foreground">{tool.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      {s.open}
                      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </StaggerItem>
              </li>
            );
          })}
        </ul>
      </Stagger>
    </section>
  );
}
