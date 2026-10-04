/** Largest request body /api/explain accepts. A valid request is well under 1 KB. */
export const MAX_BODY_BYTES = 4096;

export type BodyRead = { ok: true; text: string } | { ok: false; status: 400 | 413 };

/**
 * Reads a request body as UTF-8 text without ever buffering more than `maxBytes`.
 * A declared Content-Length over the limit is refused before reading; a chunked body is counted as
 * it streams and the stream is cancelled as soon as it crosses the limit.
 */
export async function readBodyWithLimit(req: Request, maxBytes: number = MAX_BODY_BYTES): Promise<BodyRead> {
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) return { ok: false, status: 400 };
    if (Number(declared) > maxBytes) return { ok: false, status: 413 };
  }
  if (!req.body) return { ok: true, text: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: 400 };
  }
}
