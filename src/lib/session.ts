import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Claims, FakeMode } from "./access";
import { ALG, AUDIENCE, CTX_COOKIE, ID_URL, ISSUER } from "./config";

/**
 * Reading the Boost33 session, the way the Identity contract §5 describes:
 *   1. no b33_sid         → sign in at id.boost33.com
 *   2. b33_ctx expired    → refresh, then continue
 *   3. before any write   → not applicable: this app only reads
 *
 * b33_ctx is verified locally against Identity's published keys. Issuer,
 * audience and algorithm are pinned: leaving any of them open is how a token
 * minted for something else gets accepted here.
 */
const jwks = createRemoteJWKSet(new URL(`${ID_URL}/.well-known/jwks.json`));

export async function verifyCtx(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALG],
    });
    return payload as unknown as Claims;
  } catch {
    // Expired, tampered, or keys unreachable: all mean "no usable session".
    return null;
  }
}

/**
 * Exchange b33_sid for a fresh b33_ctx, server to server.
 *
 * Identity sends no CORS headers on purpose, so the browser cannot do this
 * itself; the server can, by forwarding the person's own cookies. The new
 * cookies are scoped to .boost33.com, so passing Identity's Set-Cookie headers
 * straight back to the browser is valid from events.boost33.com.
 */
export async function refreshSession(
  cookieHeader: string,
): Promise<{ claims: Claims; setCookies: string[] } | null> {
  let res: Response;
  try {
    res = await fetch(`${ID_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const setCookies = res.headers.getSetCookie();
  const ctx = setCookies
    .map((c) => c.split(";")[0])
    .find((pair) => pair.startsWith(`${CTX_COOKIE}=`))
    ?.slice(CTX_COOKIE.length + 1);
  if (!ctx) return null;

  const claims = await verifyCtx(ctx);
  return claims ? { claims, setCookies } : null;
}

/**
 * A simulated session, for places that can never receive the .boost33.com
 * cookies: localhost, and Vercel preview URLs (*.vercel.app). Whether it may
 * be used at all is decided by `fakeSessionAllowed` — never in production.
 *
 * The ids are real UUIDs because the database stores the person id as one.
 */
export const FAKE_PEOPLE: Record<FakeMode, { sub: string; name: string; email: string; orgName: string }> = {
  sales: { sub: "00000000-0000-4000-8000-0000000000a1", name: "Arthur Hamelin", email: "arthur@example.com", orgName: "Boost33" },
  broker: { sub: "00000000-0000-4000-8000-0000000000b1", name: "Camille Martin", email: "camille@example.com", orgName: "Martin Conseil" },
  client: { sub: "00000000-0000-4000-8000-0000000000c1", name: "Vincent Durand", email: "vincent@example.com", orgName: "Atelier Lumen" },
};

export function fakeSession(mode: FakeMode): Claims {
  const person = FAKE_PEOPLE[mode];
  return {
    sub: person.sub,
    name: person.name,
    email: person.email,
    orgName: person.orgName,
    staff: mode === "sales",
    act: "preview-account",
    accounts: [{ id: "preview-account", role: "admin", products: mode === "broker" ? ["brokers"] : [] }],
  };
}
