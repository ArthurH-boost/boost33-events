import { NextResponse, type NextRequest } from "next/server";
import { setting } from "@/lib/env";
import { notificationMark, notificationsClaim } from "@/lib/events";
import { sendEventEmail } from "@/lib/mail";

/**
 * Drains the push queue: claims up to 50 queued notifications, sends one
 * email each, marks the result. Vercel calls it every 10 minutes
 * (vercel.json) with `Authorization: Bearer <CRON_SECRET>`, which Vercel sets
 * itself from the project's CRON_SECRET. A manual call with the same header
 * works too.
 */
export async function GET(request: NextRequest) {
  const secret = setting("CRON_SECRET");
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const batch = await notificationsClaim(50);
  let sent = 0, failed = 0, skipped = 0;
  for (const n of batch) {
    // An event cancelled or past between queueing and sending is not worth an email.
    if (n.event.status !== "published" || new Date(n.event.starts_at).getTime() < Date.now()) {
      await notificationMark(n.id, "skipped", null, n.event.status);
      skipped++;
      continue;
    }
    const r = await sendEventEmail(n);
    if (r.ok) { await notificationMark(n.id, "sent", r.id, null); sent++; }
    else { await notificationMark(n.id, "failed", null, r.error); failed++; }
  }
  return NextResponse.json({ claimed: batch.length, sent, failed, skipped });
}
