import { describe, expect, it } from "vitest";
import { dayMonth, fromLocalInput, toLocalInput, when } from "./format";

describe("format", () => {
  it("round-trips a Paris wall-clock time through datetime-local", () => {
    expect(fromLocalInput("2026-11-06T18:30")).toBe("2026-11-06T17:30:00.000Z"); // CET
    expect(fromLocalInput("2026-07-06T18:30")).toBe("2026-07-06T16:30:00.000Z"); // CEST
    expect(toLocalInput("2026-11-06T17:30:00.000Z")).toBe("2026-11-06T18:30");
    expect(fromLocalInput("")).toBeNull();
  });
  it("formats the date square and the row line in both languages", () => {
    expect(dayMonth("2026-11-06T17:30:00Z", "fr")).toEqual({ day: "6", month: "nov" });
    expect(dayMonth("2026-11-06T17:30:00Z", "en").month.toLowerCase()).toBe("nov");
    expect(when("2026-11-06T17:30:00Z", "2026-11-06T20:30:00Z", "en")).toContain("18:30 → 21:30");
    expect(when("2026-11-12T08:00:00Z", "2026-11-13T17:00:00Z", "en")).toContain("→");
  });
});
