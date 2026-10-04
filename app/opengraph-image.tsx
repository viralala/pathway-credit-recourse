import { ImageResponse } from "next/og";
import { BRAND, SITE_TAGLINE } from "@/lib/site";

export const alt =
  "Pathway social card on a cream background. Headline: “A rejection should be a roadmap.” Below it: plain-language reasons, a feasible plan to approval, a month-by-month timeline, money-saved estimates and a fairness audit, in English, Hindi and Marathi, as an educational simulation. On the right, pastel bars rise past a dashed approval line toward a goal dot.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHIPS = ["English · Hindi · Marathi", "Educational simulation"];
/** Bar heights (px) of the rising "timeline" illustration and their pastel fills. */
const BARS: [number, string][] = [
  [120, "#f9dde2"],
  [168, "#fde3d4"],
  [216, "#fbf1c9"],
  [264, "#d7f0e3"],
  [312, "#daeef7"],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND.background,
          color: BRAND.foreground,
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill={BRAND.periwinkle} />
              <path d="M10 54 A22 22 0 0 1 32 32 L32 54 Z" fill={BRAND.peach} />
              <path d="M32 54 A22 22 0 0 1 54 32 L54 54 Z" fill={BRAND.mint} />
              <circle cx="42.3" cy="21.7" r="6.6" fill={BRAND.primary} />
            </svg>
            <div style={{ marginLeft: 20, fontSize: 40, letterSpacing: -1, color: BRAND.primary }}>Pathway</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 74, lineHeight: 1.05, letterSpacing: -2.5 }}>{SITE_TAGLINE}</div>
            <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.4, color: BRAND.muted }}>
              Plain-language reasons, a feasible plan to approval, a month-by-month timeline, money-saved estimates and a
              fairness audit.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {CHIPS.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  marginRight: 12,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "#ffffff",
                  border: "1px solid #e6e0d6",
                  fontSize: 22,
                  color: BRAND.foreground,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "flex-end", position: "relative" }}>
          <svg width="356" height="6" viewBox="0 0 356 6" style={{ position: "absolute", left: 0, top: 220 }}>
            <line x1="0" y1="3" x2="356" y2="3" stroke={BRAND.primary} strokeOpacity="0.5" strokeWidth="3" strokeDasharray="12 10" />
          </svg>
          <div
            style={{
              position: "absolute",
              right: 4,
              top: 64,
              width: 56,
              height: 56,
              borderRadius: 999,
              background: BRAND.primary,
              display: "flex",
            }}
          />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {BARS.map(([h, fill], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 60,
                  height: h,
                  marginLeft: i === 0 ? 0 : 14,
                  borderRadius: 18,
                  background: fill,
                  border: "1px solid rgba(42, 40, 56, 0.08)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
