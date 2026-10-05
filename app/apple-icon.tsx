import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/site/BrandMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the Pathway mark, full bleed (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <BrandMark size={180} />
      </div>
    ),
    size,
  );
}
