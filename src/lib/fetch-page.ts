import "server-only";
import { parseEventPage, safeEventUrl, type Prefill } from "./import-link";

/** Fetch an event page (6 s, 2 MB max) and read what it says about the event. Null when unreadable. */
export async function prefillFromUrl(raw: string): Promise<Prefill | null> {
  const url = safeEventUrl(raw);
  if (!url) return null;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        // Some event sites serve a JS shell to unknown agents but full HTML (with JSON-LD) to crawlers.
        "user-agent": "Mozilla/5.0 (compatible; Boost33Events/1.0; +https://events.boost33.com)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fr,en;q=0.8",
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!/html|xml/.test(type)) return null;
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < 2_000_000) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const html = new TextDecoder("utf-8", { fatal: false }).decode(concat(chunks));
  const p = parseEventPage(html, url.toString());
  return p.title || p.starts_at ? p : null;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}
