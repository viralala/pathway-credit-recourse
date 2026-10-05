"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Number that counts from its previous value to `value` when visible. React always renders the
 * final `format(value)` (server HTML, screen readers and copy-paste see the real figure); only the
 * visible digits are tweened, by writing to the DOM directly.
 *
 *   <CountUp value={1234.5} format={(v) => money(v)} />
 */
export function CountUp({
  value,
  format = (v) => String(Math.round(v)),
  duration = 0.6,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const digits = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const from = useRef(0);
  // Mutate the existing text node (not textContent) so React keeps owning it.
  const write = useEffectEvent((el: HTMLElement, v: number) => {
    const node = el.firstChild;
    if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = format(v);
  });

  useEffect(() => {
    const el = digits.current;
    if (!el) return;
    if (!inView || reduce) {
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => write(el, v),
    });
    return () => {
      controls.stop();
      from.current = value;
      write(el, value);
    };
  }, [value, inView, reduce, duration]);

  const text = format(value);
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span ref={digits} aria-hidden>
        {text}
      </span>
    </span>
  );
}
