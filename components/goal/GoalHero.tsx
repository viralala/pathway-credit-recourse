import { CalendarCheck, Route, Target, Wallet } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { Lang } from "@/lib/i18n";
import { goalStrings } from "@/lib/strings/goal";

/** Page hero for /goal. Server-renderable; the only motion is the shared Reveal. */
export function GoalHero({ lang }: { lang: Lang }) {
  const s = goalStrings(lang).hero;
  const steps = [
    { icon: Target, text: s.step1, chip: "bg-pastel-peach text-deep-peach" },
    { icon: Route, text: s.step2, chip: "bg-pastel-mint text-deep-mint" },
    { icon: Wallet, text: s.step3, chip: "bg-pastel-stone text-deep-stone" },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl bg-pastel-teal/70 px-5 py-9 ring-1 ring-foreground/5 sm:px-10 sm:py-12">
      <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-pastel-mint/70 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-pastel-peach/60 blur-2xl" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-md bg-card/80 px-3 py-1 text-xs font-semibold tracking-wide text-deep-teal ring-1 ring-foreground/5">
            <CalendarCheck aria-hidden className="size-3.5" />
            {s.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">{s.title}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-deep-teal">{s.body}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <ol aria-label={s.stepsLabel} className="grid gap-3">
            {steps.map(({ icon: Icon, text, chip }, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-card/85 p-3.5 ring-1 ring-foreground/5 backdrop-blur-sm">
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${chip}`}>
                  <Icon className="size-5" />
                </span>
                <span className="text-sm leading-snug font-medium">{text}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
