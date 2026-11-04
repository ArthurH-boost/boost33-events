import { NextResponse, type NextRequest } from "next/server";
import { setting } from "@/lib/env";
import { hubWidget } from "@/lib/events";

/**
 * What the Hub's home draws in its mini-map: the person's city, how many
 * events are new this week, and the next six around them.
 *
 * Server to server: the Hub calls this with `Authorization: Bearer
 * <HUB_WIDGET_KEY>` and `?person=<b33 person id>`, the way Results calls
 * Score. Not behind the session proxy (see src/proxy.ts matcher). Without the
 * key configured the route answers 503, never an open door.
 */
export async function GET(request: NextRequest) {
  const key = setting("HUB_WIDGET_KEY");
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${key}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const person = request.nextUrl.searchParams.get("person") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(person)) return NextResponse.json({ error: "bad_person" }, { status: 400 });
  try {
    const data = await hubWidget(person);
    return NextResponse.json({ ...data, url: "https://events.boost33.com/" }, { headers: { "cache-control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
