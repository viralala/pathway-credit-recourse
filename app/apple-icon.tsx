import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the Pathway mark (two rising steps toward a goal dot) on a pastel tile. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.periwinkle,
        }}
      >
        <svg width="132" height="132" viewBox="10 10 44 44">
          <path d="M10 54 A22 22 0 0 1 32 32 L32 54 Z" fill={BRAND.peach} />
          <path d="M32 54 A22 22 0 0 1 54 32 L54 54 Z" fill={BRAND.mint} />
          <circle cx="42.3" cy="21.7" r="6.6" fill={BRAND.primary} />
        </svg>
      </div>
    ),
    size,
  );
}
