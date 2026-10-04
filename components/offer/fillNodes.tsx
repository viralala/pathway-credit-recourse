import { Fragment, type ReactNode } from "react";

/**
 * Like `tf` from lib/i18n, but placeholders may be React nodes, so translated sentences can bold a
 * number without splitting the sentence into fragments in each language.
 *
 *   fillNodes("Cost {amount} less", { amount: <strong>₹1,200</strong> })
 */
export function fillNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <Fragment key={i}>{vars[part] ?? `{${part}}`}</Fragment> : part ? <Fragment key={i}>{part}</Fragment> : null,
  );
}
