import { describe, expect, it } from "vitest";
import { asFakeMode, decideAccess, fakeSessionAllowed, firstName, signinUrl } from "./access";

describe("who is who", () => {
  it("makes Boost33 staff a sales person, who may send", () => {
    expect(decideAccess({ sub: "p", staff: true })).toEqual({ role: "sales", canSend: true });
  });

  it("makes somebody with the brokers product a broker, who may send", () => {
    expect(decideAccess({ sub: "p", accounts: [{ id: "a", products: ["brokers"] }] })).toEqual({ role: "broker", canSend: true });
  });

  it("names a staff member who also has the Brokers space as sales, not as an anonymous broker", () => {
    expect(decideAccess({ sub: "p", staff: true, accounts: [{ id: "a", products: ["brokers"] }] }).role).toBe("sales");
  });

  it("makes everybody else a client, who only receives", () => {
    expect(decideAccess({ sub: "p" })).toEqual({ role: "client", canSend: false });
    expect(decideAccess({ sub: "p", accounts: [{ id: "a", products: ["boostscore", "boosttrade"] }] })).toEqual({ role: "client", canSend: false });
    expect(decideAccess({ sub: "p", accounts: [{ id: "a", products: null }] }).canSend).toBe(false);
  });

  it("does not read a truthy non-boolean staff claim as staff", () => {
    expect(decideAccess({ sub: "p", staff: "true" as unknown as boolean }).role).toBe("client");
  });
});

describe("simulated sessions", () => {
  it("are never allowed in Vercel production", () => {
    expect(fakeSessionAllowed({ VERCEL_ENV: "production", NODE_ENV: "development" })).toBe(false);
    expect(fakeSessionAllowed({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("are allowed on previews and in next dev only", () => {
    expect(fakeSessionAllowed({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(true);
    expect(fakeSessionAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(fakeSessionAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(fakeSessionAllowed({})).toBe(false);
  });

  it("only knows its three people", () => {
    expect(asFakeMode("broker")).toBe("broker");
    expect(asFakeMode("admin")).toBeNull();
    expect(asFakeMode(null)).toBeNull();
  });
});

describe("small helpers", () => {
  it("builds a sign-in link that comes back to the page asked for", () => {
    expect(signinUrl("https://id.boost33.com", "https://events.boost33.com/?state=empty")).toBe(
      "https://id.boost33.com/signin?return=https%3A%2F%2Fevents.boost33.com%2F%3Fstate%3Dempty",
    );
  });

  it("greets by first name, and says nothing rather than use an e-mail", () => {
    expect(firstName("  Vincent Durand ")).toBe("Vincent");
    expect(firstName("")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
