// The server instrumentation hook Next calls once per runtime at startup, and the
// `onRequestError` hook it calls for every error a render or the proxy did not
// catch itself (B33-1606). A source that fails is caught in its own file and
// shown as "Unavailable" (see `sources/*.ts`), so it never reaches this hook;
// what does is anything that takes the page down.
import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

import { captureContextForDigest } from "@/lib/sentry";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

/**
 * The route is tagged from `context.routePath` (the template), never from the
 * request's own path. The digest is the identifier Next shows on the error page;
 * tagging it joins a screenshot to the event (Score's JFL-367). Set on a forked
 * isolation scope so nothing bleeds onto a later request (Score's JFL-365).
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = (error as { digest?: unknown }).digest;
  const digestTags = captureContextForDigest(typeof digest === "string" ? digest : undefined)?.tags;

  return Sentry.withIsolationScope((scope) => {
    scope.setTag("route", context.routePath);
    if (digestTags) scope.setTags(digestTags);
    return Sentry.captureRequestError(error, request, context);
  });
};
