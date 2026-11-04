import { describe, expect, it } from "vitest";
import { baseSentryOptions, redactString, scrubBreadcrumb, scrubSentryEvent, sentryEnabled } from "./sentry";

/**
 * What Boost Results sends Sentry is decided in lib/sentry.ts and nowhere else
 * (B33-1606), so these put every credential it holds and every piece of the
 * person's results into one event, and require that none comes out.
 */

describe("sentryEnabled", () => {
  it("is off with no DSN, a blank one, or a loopback placeholder", () => {
    expect(sentryEnabled(undefined)).toBe(false);
    expect(sentryEnabled("  ")).toBe(false);
    expect(sentryEnabled("http://k@127.0.0.1:9999/1")).toBe(false);
    expect(sentryEnabled("http://k@localhost:9999/1")).toBe(false);
    expect(sentryEnabled("http://k@[::1]:9999/1")).toBe(false);
  });

  it("is on for a real ingest host", () => {
    expect(sentryEnabled("https://k@o1.ingest.de.sentry.io/2")).toBe(true);
  });

  it("disables init rather than throwing when there is no DSN", () => {
    expect(baseSentryOptions(undefined)).toMatchObject({ enabled: false, dsn: undefined, sendDefaultPii: false });
  });
});

describe("scrubSentryEvent", () => {
  const claims = { sub: "person-1", sid: "sid-value", email: "vincent@example.com", name: "Vincent Durand", orgName: "Atelier Lumen", act: "acc-1" };
  const event = () => ({
    message: "results_trade_overview failed for vincent@example.com",
    request: {
      url: "https://events.boost33.com/?as=broker&state=empty",
      query_string: "as=broker&state=empty",
      data: { p_person: "person-1" },
      cookies: { b33_sid: "sid-value", b33_ctx: "eyJhbGciOi.eyJzdWIi.sig" },
      headers: {
        Cookie: "b33_sid=sid-value; b33_ctx=eyJhbGciOi.eyJzdWIi.sig",
        Authorization: "Bearer score-api-key",
        "Proxy-Authorization": "Basic proxy-cred",
        apikey: "sb_secret_outbound-role-key",
        "x-events-claims": encodeURIComponent(JSON.stringify(claims)),
        "x-vercel-protection-bypass": "bypass-secret",
        "user-agent": "test",
      },
    },
    tags: { route: "/", sid: "sid-value", digest: "123" },
    user: { id: "person-1", email: "vincent@example.com", name: "Vincent Durand" },
    sdk: { name: "sentry.javascript.nextjs", version: "10" },
    contexts: { runtime: { name: "node", version: "22" } },
    extra: {
      env: {
        SUPABASE_JWT_SECRET: "jwt-signing-secret",
        SUPABASE_JWT_KEY: "jwt-signing-secret",
        SUPABASE_ANON_KEY: "anon-key-value",
        OUTBOUND_SUPABASE_SERVICE_ROLE_KEY: "outbound-role-key",
        SCORE_API_KEY: "score-api-key",
        SCORE_API_URL: "https://score.boost33.com",
      },
      claims,
      outbound: {
        org_name: "Atelier Lumen",
        reached: 357,
        latest: [{ id: "r1", name: "Jeanne Leroy", company: "Leroy SAS", snippet: "Call me Monday", qualification: "hot", campaign: "Q4 bakers", intent: "interesse" }],
      },
      trade: { latest: [{ id: "i1", company: "Ferme Haute", contact_name: "Paul Petit", need: "new roof", status: "won" }] },
      score: { waitingSavingsLowCents: "420000", waitingSavingsHighCents: "910000", items: [{ id: "m1", supplier: "Toitures Nord", savingsLowCents: "210000", savingsHighCents: "480000", score: 87 }] },
      funding: { client: { amountText: "48 000 €", schemes: [{ slug: "cii", funded: 12000, rest: 36000 }] }, profile: { company: { siren: "123456789" }, offer: { client: { amount: "48000" } } } },
    },
    breadcrumbs: [
      { category: "fetch", data: { url: "https://score.boost33.com/api/internal/accounts/acc-1/summary?debug=1", authorization: "Bearer score-api-key" } },
      { category: "navigation", data: { from: "/signin?return=https%3A%2F%2Fevents.boost33.com%2F", to: "/" } },
    ],
    exception: {
      values: [{ value: "rpc refused eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc with Bearer score-api-key and sb_secret_outbound-role-key" }],
    },
  });

  it("leaves no credential, session, address, result or query string anywhere on the event", () => {
    const out = JSON.stringify(scrubSentryEvent(event()));
    for (const leak of [
      "vincent@example.com",
      "Vincent Durand",
      "Atelier Lumen",
      "sid-value",
      "eyJ",
      "jwt-signing-secret",
      "anon-key-value",
      "outbound-role-key",
      "score-api-key",
      "bypass-secret",
      "proxy-cred",
      "Jeanne Leroy",
      "Leroy SAS",
      "Call me Monday",
      "Q4 bakers",
      "Ferme Haute",
      "Paul Petit",
      "new roof",
      "Toitures Nord",
      "420000",
      "910000",
      "210000",
      "480000",
      "48 000",
      "48000",
      "12000",
      "36000",
      "123456789",
      "as=broker",
      "debug=1",
      "return=",
    ]) {
      expect(out).not.toContain(leak);
    }
  });

  it("keeps what an engineer needs to find the failure", () => {
    const out = scrubSentryEvent(event()) as ReturnType<typeof event>;
    expect(out.request.url).toBe("https://events.boost33.com/");
    expect(out.request.headers).toEqual({ "user-agent": "test" });
    expect(out.tags).toEqual({ route: "/", digest: "123" });
    expect(out.user).toEqual({ id: "person-1" });
    expect(out.extra.claims).toEqual({ sub: "person-1", act: "acc-1" });
    expect(out.extra.env).toEqual({ SCORE_API_URL: "https://score.boost33.com" });
    expect(out.extra.outbound).toEqual({ reached: 357, latest: [{ id: "r1", intent: "interesse" }] });
    expect(out.extra.score.items).toEqual([{ id: "m1", score: 87 }]);
    expect(out.breadcrumbs[0].data.url).toBe("https://score.boost33.com/api/internal/accounts/acc-1/summary");
    expect(out.message).toBe("results_trade_overview failed for [email]");
  });

  it("leaves the SDK's own names alone", () => {
    const out = scrubSentryEvent(event()) as ReturnType<typeof event>;
    expect(out.sdk).toEqual({ name: "sentry.javascript.nextjs", version: "10" });
    expect(out.contexts.runtime).toEqual({ name: "node", version: "22" });
  });

  it("survives a cyclic event", () => {
    const cyclic: Record<string, unknown> = { message: "x" };
    cyclic.self = cyclic;
    expect(() => scrubSentryEvent(cyclic)).not.toThrow();
  });
});

describe("redactString", () => {
  it("drops a query string carrying an address without swallowing the URL before it", () => {
    expect(redactString("https://host/p?invite=a@b.com&tab=x")).toBe("https://host/p");
  });

  it("drops a fragment too", () => {
    expect(redactString("GET https://events.boost33.com/#reply-r1 failed")).toBe("GET https://events.boost33.com/ failed");
  });

  it("redacts a bearer credential written into free text", () => {
    expect(redactString("401 from score with Bearer abc.def")).toBe("401 from score with Bearer [redacted]");
  });

  it("redacts a JWT and a Supabase secret key", () => {
    expect(redactString("token eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoieCJ9.sig")).toBe("token [jwt]");
    expect(redactString("key sb_secret_abc123")).toBe("key [supabase-key]");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs, which are the log drain's lines", () => {
    expect(scrubBreadcrumb({ category: "console", message: "[results] score summary failed: HTTP 500" })).toBeNull();
  });

  it("keeps and scrubs the rest", () => {
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "https://x.test/p?account=9" } })).toEqual({
      category: "fetch",
      data: { url: "https://x.test/p" },
    });
  });
});
