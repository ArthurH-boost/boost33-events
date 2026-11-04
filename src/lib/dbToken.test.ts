import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { DB_TOKEN_TTL_SECONDS, signServiceToken } from "./dbToken";

const SECRET = "a-test-secret-that-is-long-enough-for-hs256";

describe("the database token", () => {
  it("carries the service role and nothing about who is acting", async () => {
    const token = await signServiceToken(SECRET, 1_000);
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(SECRET), { currentDate: new Date(1_000_000) });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.role).toBe("service_role");
    expect(payload.sub).toBeUndefined();
  });

  it("lives one minute", async () => {
    const token = await signServiceToken(SECRET, 1_000);
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET), { currentDate: new Date(1_000_000) });
    expect(DB_TOKEN_TTL_SECONDS).toBe(60);
    expect(payload.exp! - payload.iat!).toBe(60);
    await expect(jwtVerify(token, new TextEncoder().encode(SECRET), { currentDate: new Date((1_000 + 61) * 1000) })).rejects.toThrow();
  });

  it("is not accepted under another secret", async () => {
    const token = await signServiceToken(SECRET);
    await expect(jwtVerify(token, new TextEncoder().encode("another-secret-entirely-and-long-enough"))).rejects.toThrow();
  });

  it("refuses to sign without a secret", async () => {
    await expect(signServiceToken("")).rejects.toThrow("SUPABASE_JWT_SECRET");
  });
});
