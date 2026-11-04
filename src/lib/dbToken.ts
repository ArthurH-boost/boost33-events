import { SignJWT } from "jose";

/**
 * The token the database trusts for one request.
 *
 * The brokers project's tables are closed to the browser roles: RLS is forced
 * with no policy, and every function is granted to `service_role` only. So the server signs a short-lived Supabase JWT with the
 * `service_role` role, from the project's JWT secret, instead of holding the
 * long-lived service key.
 *
 * That makes this the most powerful thing in the app. It is signed per call,
 * lives one minute, and never leaves the server (src/lib/db.ts is
 * `server-only`). Who is acting is NOT in this token: it is passed to each
 * function as `p_person` / `p_actor`, and each function only returns that
 * person's rows. Copied from boost33-trade/src/lib/dbToken.ts.
 *
 * Kept free of Next and Supabase imports so it can be unit tested.
 */
export const DB_TOKEN_TTL_SECONDS = 60;

export async function signServiceToken(
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set.");
  return new SignJWT({ role: "service_role" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("boost33-events")
    .setIssuedAt(now)
    .setExpirationTime(now + DB_TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}
