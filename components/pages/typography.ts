/**
 * Small-caps style label: uppercase with wide letter-spacing for Latin text, and no extra spacing
 * for Hindi and Marathi, where tracking breaks the Devanagari headline stroke.
 */
export const TRACKED = "uppercase tracking-[0.16em] [&:lang(hi)]:tracking-normal [&:lang(mr)]:tracking-normal";
