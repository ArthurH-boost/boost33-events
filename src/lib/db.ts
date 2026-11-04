import "server-only";
import { createClient } from "@supabase/supabase-js";
import { signServiceToken } from "./dbToken";
import { setting } from "./env";

/**
 * The one door to the "brokers" Supabase project (Off Market + Financing).
 *
 * Adapted from boost33-trade/src/lib/db.ts. This app only READS, and never a
 * table directly: every access is a call to an `events_*` function, as `service_role`, with a one-minute token signed per call.
 * No local dev database here: simulated sessions run on fixtures.
 */
export function brokersConfigured(): boolean {
  return Boolean(setting("SUPABASE_URL") && setting("SUPABASE_ANON_KEY") && setting("SUPABASE_JWT_SECRET"));
}

type Args = Record<string, unknown>;

/** The name is a literal in this codebase, never input; this keeps it that way. */
export function isAllowedFunction(name: string): boolean {
  return /^events_[a-z_]+$/.test(name);
}

/** Call a function that returns one value (jsonb here). Throws; the sources catch. */
export async function callValue<T>(name: string, args: Args): Promise<T> {
  if (!isAllowedFunction(name)) throw new Error(`Not a Boost Events function: ${name}`);
  if (!brokersConfigured()) throw new Error("database_not_configured");
  const token = await signServiceToken(setting("SUPABASE_JWT_SECRET")!);
  const client = createClient(setting("SUPABASE_URL")!, setting("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
