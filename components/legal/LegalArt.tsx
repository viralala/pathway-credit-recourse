/**
 * Decorative illustration for legal page headers (original artwork made for Pathway): a dotted
 * path climbing through pastel stepping stones to a goal dot. Purely decorative, so it is hidden
 * from assistive technology.
 */
export function LegalArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      <circle cx="150" cy="150" r="70" fill="var(--pastel-stone)" />
      <circle cx="58" cy="160" r="22" fill="var(--pastel-peach)" />
      <circle cx="104" cy="118" r="18" fill="var(--pastel-mint)" />
      <circle cx="142" cy="78" r="15" fill="var(--pastel-butter)" />
      <path
        d="M58 160 C 80 140, 90 130, 104 118 S 130 92, 142 78 S 160 50, 170 38"
        fill="none"
        stroke="var(--deep-teal)"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <circle cx="170" cy="36" r="9" fill="var(--primary)" />
    </svg>
  );
}
