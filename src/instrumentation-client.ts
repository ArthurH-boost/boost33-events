// Sentry for the browser (B33-1606). The DSN is public by design, so it can be
// inlined into the bundle; with it unset reporting is off and nothing throws.
// No Replay: the page shows the person's leads, introductions and savings.
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry";

Sentry.init(baseSentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
