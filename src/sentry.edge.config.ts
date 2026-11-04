// Sentry for the Edge runtime (the proxy), imported by `instrumentation.ts`
// (B33-1606). Edge-safe: `lib/sentry.ts` touches no Node built-ins.
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry";

Sentry.init(baseSentryOptions(process.env.SENTRY_DSN));
