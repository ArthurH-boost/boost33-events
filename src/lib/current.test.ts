import { describe, expect, it } from "vitest";
import { isAdmin } from "./current";

describe("isAdmin", () => {
  it("staff are admins; listed emails are admins; others are not", () => {
    expect(isAdmin({ sub: "x", staff: true }, {})).toBe(true);
    expect(isAdmin({ sub: "x", email: "Dez@boost33.com" }, { ADMIN_EMAILS: "arthur@boost33.com, dez@boost33.com" })).toBe(true);
    expect(isAdmin({ sub: "x", email: "someone@example.com" }, { ADMIN_EMAILS: "arthur@boost33.com" })).toBe(false);
    expect(isAdmin({ sub: "x" }, {})).toBe(false);
  });
});
