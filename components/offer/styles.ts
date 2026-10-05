import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { Severity, Verdict } from "@/lib/offer";

/**
 * Every colour decision of the Offer check lives here, as design-token class names, so a re-skin
 * only touches this file. Colour is never the only signal: each style comes with an icon, and the
 * components always print the label text next to it.
 */

export const VERDICT_STYLE: Record<Verdict, { box: string; icon: LucideIcon }> = {
  fair: { box: "bg-success-soft text-success-foreground", icon: CircleCheck },
  expensive: { box: "bg-warning-soft text-warning-foreground", icon: TriangleAlert },
  predatory: { box: "bg-danger-soft text-danger-foreground", icon: OctagonAlert },
};

export const SEVERITY_STYLE: Record<Severity, { row: string; badge: string; icon: LucideIcon; iconClass: string }> = {
  danger: {
    row: "bg-danger-soft/50 ring-1 ring-danger/15",
    badge: "bg-danger-soft text-danger-foreground ring-1 ring-danger/20",
    icon: OctagonAlert,
    iconClass: "text-danger",
  },
  warning: {
    row: "bg-warning-soft/50 ring-1 ring-warning/15",
    badge: "bg-warning-soft text-warning-foreground ring-1 ring-warning/20",
    icon: TriangleAlert,
    iconClass: "text-warning",
  },
  info: {
    row: "bg-muted/70 ring-1 ring-foreground/5",
    badge: "bg-secondary text-secondary-foreground ring-1 ring-foreground/10",
    icon: Info,
    iconClass: "text-primary",
  },
};

export type SegmentKind = "principal" | "fees" | "interest";

/** Bar segments: a chart colour plus a texture, so the parts differ without relying on colour. */
export const SEGMENT_STYLE: Record<SegmentKind, { className: string; style?: CSSProperties }> = {
  principal: { className: "bg-chart-3" },
  fees: {
    className: "bg-chart-2",
    style: {
      backgroundImage:
        "repeating-linear-gradient(45deg, color-mix(in srgb, var(--card) 45%, transparent) 0 3px, transparent 3px 8px)",
    },
  },
  interest: {
    className: "bg-chart-5",
    style: {
      backgroundImage: "radial-gradient(color-mix(in srgb, var(--card) 60%, transparent) 1.3px, transparent 1.6px)",
      backgroundSize: "7px 7px",
    },
  },
};

/** Pastel tiles used for the "What you can do" icons, in display order (cycled). */
export const TILE_STYLES = [
  "bg-pastel-teal text-deep-teal",
  "bg-pastel-mint text-deep-mint",
  "bg-pastel-peach text-deep-peach",
  "bg-pastel-blush text-deep-blush",
  "bg-pastel-butter text-deep-butter",
  "bg-pastel-stone text-deep-stone",
  "bg-pastel-sky text-deep-sky",
] as const;

export const CARD = "rounded-2xl";
