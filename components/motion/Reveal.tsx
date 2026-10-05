import type { ReactNode } from "react";

/*
 * Reveal, Stagger and StaggerItem used to fade content in as it scrolled into view. Content now
 * simply appears: scroll-triggered animation adds nothing to a page of numbers, and it delays what
 * people came to read. The components stay so callers keep their structure; they render plain
 * elements with the same class names.
 */
export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const Comp = as;
  return <Comp className={className}>{children}</Comp>;
}

export function Stagger({ children, className }: { children: ReactNode; className?: string; gap?: number }) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
