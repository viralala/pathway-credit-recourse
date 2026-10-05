"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * "On this page" navigation. Plain anchor links, so it works without JavaScript. On phones it is a
 * collapsed disclosure so the text starts near the top; on large screens it is an always-open list
 * in a sticky sidebar. Once hydrated it marks the section being read with aria-current="location".
 */
export function TableOfContents({ items, label = "On this page" }: { items: TocItem[]; label?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const idsKey = items.map((i) => i.id).join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = idsKey.split("|");
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const inView = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView.set(e.target.id, e.isIntersecting);
        const first = ids.find((id) => inView.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [idsKey]);

  const list = (
    <ol className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-1">
      {items.map((item, i) => {
        const current = active === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={current ? "location" : undefined}
              className={cn(
                "flex gap-2 rounded-lg px-2 py-1.5 leading-snug transition-colors",
                current
                  ? "bg-secondary font-semibold text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span aria-hidden className="w-5 shrink-0 tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav aria-label={label}>
      <details className="group rounded-xl bg-card border border-border lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>
            {label}
            <span className="ml-2 font-normal text-muted-foreground">{items.length} sections</span>
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-2 pb-3">{list}</div>
      </details>

      <div className="hidden rounded-xl bg-card p-5 border border-border lg:block">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className="mt-3">{list}</div>
      </div>
    </nav>
  );
}
