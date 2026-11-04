import { describe, expect, it } from "vitest";
import { isPlatform, platformFromUrl, safeUrl } from "./online";

describe("online events", () => {
  it("recognises the platform from the link", () => {
    expect(platformFromUrl("https://www.tiktok.com/@boost33/live")).toBe("tiktok");
    expect(platformFromUrl("https://www.whatnot.com/live/abc")).toBe("whatnot");
    expect(platformFromUrl("https://us02web.zoom.us/j/123456")).toBe("zoom");
    expect(platformFromUrl("https://teams.microsoft.com/l/meetup-join/x")).toBe("teams");
    expect(platformFromUrl("https://meet.google.com/abc-defg-hij")).toBe("meet");
    expect(platformFromUrl("https://www.twitch.tv/boost33")).toBe("twitch");
    expect(platformFromUrl("https://youtu.be/xyz")).toBe("youtube");
    expect(platformFromUrl("https://www.linkedin.com/events/123")).toBe("linkedin");
    expect(platformFromUrl("https://example.com/webinar")).toBeNull();
    expect(platformFromUrl("https://nottiktok.com/live")).toBeNull();
  });
  it("only lets plain web links through", () => {
    expect(safeUrl(" https://zoom.us/j/1 ")).toBe("https://zoom.us/j/1");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
    expect(safeUrl("zoom.us/j/1")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
  it("knows its platforms", () => {
    expect(isPlatform("twitch")).toBe(true);
    expect(isPlatform("myspace")).toBe(false);
  });
});
