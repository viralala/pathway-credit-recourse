import { Fragment, type ReactNode } from "react";

/**
 * Like `tf` from lib/i18n, but placeholders can be React nodes (e.g. an animated number), so a
 * translated sentence keeps its word order in every language.
 *
 *   fillNode("Reach your goal in {n} months", { n: <CountUp value={9} /> })
 */
export function fillNode(template: string, vars: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((part, i) => (i % 2 === 1 ? <Fragment key={i}>{vars[part] ?? `{${part}}`}</Fragment> : part));
}
