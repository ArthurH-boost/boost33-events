/**
 * Settings read from the environment, each under its name here and under the
 * other names it has been given in Vercel (same convention as boost33-brokers:
 * accepting both means nobody has to rename a secret they can't see again).
 */
const ALIASES = {
  SUPABASE_URL: ["SUPABASE_URL"],
  SUPABASE_ANON_KEY: ["SUPABASE_ANON_KEY"],
  SUPABASE_JWT_SECRET: ["SUPABASE_JWT_SECRET", "SUPABASE_JWT_KEY"],
  IDENTITY_URL: ["B33_ID_URL", "BOOST33_IDENTITY_URL"],
  MAPTILER_KEY: ["MAPTILER_KEY", "NEXT_PUBLIC_MAPTILER_KEY"],
  RESEND_API_KEY: ["RESEND_API_KEY"],
  CRON_SECRET: ["CRON_SECRET"],
  HUB_WIDGET_KEY: ["HUB_WIDGET_KEY"],
  ADMIN_EMAILS: ["ADMIN_EMAILS"],
} as const;

export type Setting = keyof typeof ALIASES;

/** The first non-empty value among the setting's names, or undefined. */
export function setting(name: Setting, env: Record<string, string | undefined> = process.env): string | undefined {
  for (const key of ALIASES[name]) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function requiredSetting(name: Setting): string {
  const value = setting(name);
  if (!value) throw new Error(`${ALIASES[name].join(" or ")} is not set.`);
  return value;
}
