import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/site/BrandMark";
import { BRAND, SITE_TAGLINE } from "@/lib/site";

export const alt =
  "Pathway share card on a cream background. Headline: “Loan declined? See why, what to change and when to apply again.” Below it: plain-language reasons, a realistic plan and the interest you save in rupees, in English, Hindi and Marathi. On the right, bars rise past a dashed approval line.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Latin text only: the image font bundled with next/og has no Devanagari glyphs.
const CHIPS = ["English · Hindi · Marathi", "Free for borrowers"];
/** Bar heights (px) of the rising "timeline" illustration and their pastel fills. */
const BARS: [number, string][] = [
  [120, "#f9dde2"],
  [168, "#fde3d4"],
  [216, "#fbf1c9"],
  [264, "#d7f0e3"],
  [312, "#d9ecea"],
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
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <BrandMark size={64} />
            <div style={{ marginLeft: 20, fontSize: 40, letterSpacing: -1, color: BRAND.foreground }}>Pathway</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 66, lineHeight: 1.05, letterSpacing: -2 }}>{SITE_TAGLINE}</div>
            <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.4, color: BRAND.muted }}>
              Plain-language reasons, a realistic plan to approval and the interest you save in rupees.
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
                  borderRadius: 8,
                  background: "#ffffff",
                  border: "1px solid #e0d8c7",
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
          <svg width="330" height="6" viewBox="0 0 330 6" style={{ position: "absolute", left: 0, top: 220 }}>
            <line x1="0" y1="3" x2="330" y2="3" stroke={BRAND.primary} strokeOpacity="0.6" strokeWidth="3" strokeDasharray="12 10" />
          </svg>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {BARS.map(([h, fill], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 52,
                  height: h,
                  marginLeft: i === 0 ? 0 : 14,
                  borderRadius: 8,
                  background: fill,
                  border: "1px solid rgba(12, 20, 24, 0.1)",
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
