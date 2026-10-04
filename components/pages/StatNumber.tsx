"use client";

import { CountUp } from "@/components/motion/CountUp";

/**
 * Serializable wrapper around <CountUp> so server components can animate a number
 * without passing a format function across the server/client boundary.
 */
export function StatNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return <CountUp value={value} className={className} format={(v) => `${prefix}${v.toFixed(decimals)}${suffix}`} />;
}
