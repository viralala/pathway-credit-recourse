/**
 * A formatted number. It used to count up from zero when scrolled into view; figures now show
 * their real value straight away. Kept as a component so callers do not change.
 *
 *   <CountUp value={1234.5} format={(v) => inr(v)} />
 */
export function CountUp({
  value,
  format = (v) => String(Math.round(v)),
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  return <span className={className}>{format(value)}</span>;
}
