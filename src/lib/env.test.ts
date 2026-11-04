import { describe, expect, it } from "vitest";
import { setting } from "./env";

describe("setting", () => {
  it("reads the name the code uses", () => {
    expect(setting("SUPABASE_JWT_SECRET", { SUPABASE_JWT_SECRET: "a" })).toBe("a");
  });
  it("falls back to the name set in Vercel", () => {
    expect(setting("SUPABASE_JWT_SECRET", { SUPABASE_JWT_KEY: "b" })).toBe("b");
    expect(setting("IDENTITY_URL", { BOOST33_IDENTITY_URL: "https://id.boost33.com" })).toBe("https://id.boost33.com");
  });
  it("ignores empty values", () => {
    expect(setting("IDENTITY_URL", { B33_ID_URL: " ", BOOST33_IDENTITY_URL: "https://id.example" })).toBe("https://id.example");
    expect(setting("SUPABASE_URL", {})).toBeUndefined();
  });
});
