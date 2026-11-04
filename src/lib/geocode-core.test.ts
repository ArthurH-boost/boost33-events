import { describe, expect, it } from "vitest";
import { geocodeUrl, parseHits } from "./geocode-core";

describe("geocode-core", () => {
  it("builds a city lookup with autocomplete", () => {
    const u = new URL(geocodeUrl(" Nantes ", "k", "city", { autocomplete: true, limit: 5 }));
    expect(u.pathname).toBe("/geocoding/Nantes.json");
    expect(u.searchParams.get("types")).toBe("municipality,locality,place");
    expect(u.searchParams.get("autocomplete")).toBe("true");
    expect(u.searchParams.get("limit")).toBe("5");
  });
  it("reads cities and addresses", () => {
    const hits = parseHits(
      {
        features: [
          { place_name: "Nantes, Loire-Atlantique, France", text: "Nantes", place_type: ["municipality"], center: [-1.5536, 47.2184] },
          { place_name: "2 rue X, 35000 Rennes", text: "2 rue X", place_type: ["address"], center: [-1.69, 48.11], context: [{ id: "municipality.1", text: "Rennes" }] },
          { place_name: "no centre" },
        ],
      },
      "q",
    );
    expect(hits).toEqual([
      { label: "Nantes, Loire-Atlantique, France", city: "Nantes", lat: 47.2184, lng: -1.5536 },
      { label: "2 rue X, 35000 Rennes", city: "Rennes", lat: 48.11, lng: -1.69 },
    ]);
    expect(parseHits(null, "q")).toEqual([]);
  });
});
