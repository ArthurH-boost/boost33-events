import { BROKERS_PRODUCT } from "./config";

/** The b33_ctx claims this app reads. Everything is optional-safe, per the contract. */
export type Claims = {
  sub: string;
  sid?: string;
  email?: string;
  name?: string | null;
  org?: string | null;
  orgName?: string | null;
  staff?: boolean;
  verified?: boolean;
  act?: string | null;
  accounts?: Array<{
    id: string;
    role?: "admin" | "member";
    walletId?: string | null;
    products?: string[] | null;
  }>;
};

/** The three kinds of people, as in Boost Off Market. Here it only names the simulated person. */
export type Role = "sales" | "broker" | "client";

export type Access = {
  role: Role;
  /** May create an intro: Boost33 sales and brokers. Clients only receive. */
  canSend: boolean;
};

/**
 * Who is who.
 *
 * - Sales  = the person-level `staff` claim (Boost33's own people). Named to
 *            the recipient.
 * - Broker = an account carrying the `brokers` product. Anonymous to the
 *            recipient — the database enforces that, not this file.
 * - Client = everybody else who is signed in. They receive intros.
 *
 * Staff wins over broker: a Boost33 employee who also has the Brokers space is
 * acting for Boost33 and is named.
 *
 * Every signed-in member may enter (a client has to be able to open the intro
 * they were sent). What is restricted is sending, and the database re-checks it
 * (trade_create_intro) — this is the first line, never the only one.
 */
export function decideAccess(claims: Claims): Access {
  const staff = claims.staff === true;
  const broker = (claims.accounts ?? []).some((a) => (a.products ?? []).includes(BROKERS_PRODUCT));
  const role: Role = staff ? "sales" : broker ? "broker" : "client";
  return { role, canSend: role !== "client" };
}

/** The sign-in link. `return` wins over `app` on Identity's side, so it is the only one sent. */
export function signinUrl(idUrl: string, returnTo: string): string {
  return `${idUrl}/signin?return=${encodeURIComponent(returnTo)}`;
}

export const FAKE_MODES = ["sales", "broker", "client"] as const;
export type FakeMode = (typeof FAKE_MODES)[number];

export function asFakeMode(value: string | null | undefined): FakeMode | null {
  return (FAKE_MODES as readonly string[]).includes(value ?? "") ? (value as FakeMode) : null;
}

/**
 * May this deployment use a simulated session?
 *
 * - Vercel production (VERCEL_ENV=production): never. This is what keeps
 *   events.boost33.com on real sessions only.
 * - Vercel preview (VERCEL_ENV=preview): yes. Preview URLs are *.vercel.app,
 *   which can never receive the .boost33.com cookies, and Vercel restricts them
 *   to the team.
 * - Anywhere else: only in `next dev` (NODE_ENV=development). A local
 *   `next start` behaves like production.
 */
export function fakeSessionAllowed(env: { VERCEL_ENV?: string; NODE_ENV?: string }): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.VERCEL_ENV === "preview") return true;
  return env.NODE_ENV === "development";
}

/** First name for greetings, falling back to nothing rather than to the email. */
export function firstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : null;
}
