import { describe, expect, it } from "vitest";
import { fromJsonLd, fromMeta, parseEventPage, safeEventUrl } from "./import-link";

const EVENTBRITE = `<html><head><title>x</title>
<meta property="og:title" content="OG title"><meta property="og:image" content="https://img.example/cover.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"Afterwork Startups &amp; Co","startDate":"2026-11-06T18:30:00+01:00","endDate":"2026-11-06T21:30:00+01:00",
"description":"Soir&eacute;e<br>mensuelle <b>libre</b>","organizer":{"@type":"Organization","name":"French Tech"},
"location":{"@type":"Place","name":"Le Mabilay","address":{"@type":"PostalAddress","streetAddress":"2 rue de la Mabilais","postalCode":"35000","addressLocality":"Rennes"},"geo":{"@type":"GeoCoordinates","latitude":48.11,"longitude":-1.69}},
"offers":{"@type":"Offer","price":"0","url":"https://tickets.example/1"}}</script></head></html>`;

describe("fromJsonLd", () => {
  it("reads a schema.org Event", () => {
    const p = fromJsonLd(EVENTBRITE)!;
    expect(p.title).toBe("Afterwork Startups & Co");
    expect(p.starts_at).toBe("2026-11-06T17:30:00.000Z");
    expect(p.venue_name).toBe("Le Mabilay");
    expect(p.address).toBe("2 rue de la Mabilais, 35000, Rennes");
    expect(p.city).toBe("Rennes");
    expect(p.lat).toBe(48.11);
    expect(p.organiser).toBe("French Tech");
    expect(p.price).toBe("free");
    expect(p.ticket_url).toBe("https://tickets.example/1");
    expect(p.description).toContain("mensuelle libre");
    expect(p.description).not.toContain("<b>");
  });
  it("marks online events", () => {
    const html = `<script type="application/ld+json">{"@type":"BusinessEvent","name":"Webinar","startDate":"2026-12-01T12:00:00Z","eventAttendanceMode":"https://schema.org/OnlineEventAttendanceMode","location":{"@type":"VirtualLocation","url":"https://zoom.example"}}</script>`;
    expect(fromJsonLd(html)!.is_online).toBe(true);
  });
  it("returns null without an Event", () => {
    expect(fromJsonLd(`<script type="application/ld+json">{"@type":"Organization","name":"x"}</script>`)).toBeNull();
  });
});

describe("fromMeta / parseEventPage", () => {
  it("falls back to OpenGraph and keeps the page as the ticket link", () => {
    const html = `<meta property="og:title" content="Meetup IA"><meta content="desc" name="description">`;
    const p = parseEventPage(html, "https://meetup.example/e/1");
    expect(p.title).toBe("Meetup IA");
    expect(p.description).toBe("desc");
    expect(p.ticket_url).toBe("https://meetup.example/e/1");
  });
  it("prefers JSON-LD over OpenGraph", () => {
    expect(parseEventPage(EVENTBRITE, "https://x").title).toBe("Afterwork Startups & Co");
    expect(fromMeta(EVENTBRITE).title).toBe("OG title");
  });
});

describe("safeEventUrl", () => {
  it("accepts public https pages and refuses local ones", () => {
    expect(safeEventUrl("https://www.eventbrite.fr/e/x")?.hostname).toBe("www.eventbrite.fr");
    expect(safeEventUrl("http://localhost:3000/")).toBeNull();
    expect(safeEventUrl("http://10.0.0.1/")).toBeNull();
    expect(safeEventUrl("ftp://x.example/")).toBeNull();
    expect(safeEventUrl("nope")).toBeNull();
  });
});
