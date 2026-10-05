import { BRAND } from "@/lib/site";

/**
 * The Pathway mark as a plain SVG with literal colours, for places CSS variables cannot reach:
 * the Apple touch icon and the social share image (both drawn by next/og). Same drawing as
 * app/icon.svg and, at a heavier stroke, the header's LogoMark.
 */
export function BrandMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill={BRAND.tile} />
      <path d="M16 47c8.4 0 10-13 18-13s8.8-12.4 14.4-15.2" fill="none" stroke={BRAND.primary} strokeWidth="5" strokeLinecap="round" />
      <circle cx="16" cy="47" r="6" fill={BRAND.peach} stroke={BRAND.peachDeep} strokeWidth="2.8" />
      <circle cx="48.8" cy="18.4" r="7.2" fill={BRAND.mint} stroke={BRAND.mintDeep} strokeWidth="2.8" />
      <path d="M45.8 18.6l2 2 3.8-4" fill="none" stroke={BRAND.mintDeep} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
