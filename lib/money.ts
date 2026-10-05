/**
 * Money on Pathway is Indian rupees everywhere: inputs, plans, reports and the database.
 *
 * The credit model was trained on the public "Give Me Some Credit" dataset, so its income feature
 * is in that dataset's units. Every rupee income is divided by INR_PER_MODEL_UNIT
 * on its way into the model (lib/model.ts) and nowhere else. A fixed factor near India's
 * purchasing-power parity (the World Bank puts it at roughly ₹20 to ₹23 per international dollar in
 * recent years) keeps the incomes realistic for Indian borrowers: a market exchange rate would turn
 * a ₹60,000 salary into a very low income for this model. Because the model uses log(income), the
 * factor only shifts the scale; it does not change how income is weighed against anything else.
 */
export const INR_PER_MODEL_UNIT = 20;

/** Rupees with Indian digit grouping: 250000 → "₹2,50,000". Rounded to the rupee. */
export function inr(v: number): string {
  const n = Math.round(Number.isFinite(v) ? v : 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

/** Indian digit grouping without the symbol, for input fields: 250000 → "2,50,000". */
export function groupIN(v: number): string {
  return Math.round(Number.isFinite(v) ? v : 0).toLocaleString("en-IN");
}

/** "lakh" and "crore" in the page language. */
export const UNIT_WORDS = {
  en: { lakh: "lakh", crore: "crore" },
  hi: { lakh: "लाख", crore: "करोड़" },
  mr: { lakh: "लाख", crore: "कोटी" },
} as const;

/**
 * Short rupee labels in lakh and crore, for axes, slider ends and headings:
 * 50000 → "₹50,000", 250000 → "₹2.5 lakh", 10000000 → "₹1 crore".
 */
export function inrShort(v: number, lang: keyof typeof UNIT_WORDS = "en"): string {
  const w = UNIT_WORDS[lang];
  const n = Math.round(Number.isFinite(v) ? v : 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)} ${w.crore}`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)} ${w.lakh}`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}
