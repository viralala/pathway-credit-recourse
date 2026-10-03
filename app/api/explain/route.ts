import { NextResponse } from "next/server";

/**
 * Optional plain-language rewrite. Uses Claude only when ANTHROPIC_API_KEY is set on the server;
 * on any missing key, error or timeout it returns the templated text unchanged.
 */
const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi" };

export async function POST(req: Request) {
  let text = "";
  let lang = "en";
  try {
    const body = (await req.json()) as { text?: unknown; lang?: unknown };
    text = typeof body.text === "string" ? body.text.slice(0, 2000) : "";
    lang = typeof body.lang === "string" && body.lang in LANG_NAME ? body.lang : "en";
  } catch {
    return NextResponse.json({ text: "", source: "template" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !text) return NextResponse.json({ text, source: "template" });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 400,
        system:
          "You rewrite loan-decision explanations for borrowers in very plain, warm language. Keep every number and fact exactly as given, add nothing new, give no financial advice, and stay under 90 words.",
        messages: [{ role: "user", content: `Rewrite this in simple ${LANG_NAME[lang]}:\n\n${text}` }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (!out) throw new Error("empty");
    return NextResponse.json({ text: out, source: "ai" });
  } catch {
    return NextResponse.json({ text, source: "template" });
  }
}
