// Sentry for the Node server runtime, imported by `instrumentation.ts` (B33-1606).
// With `SENTRY_DSN` unset it initialises disabled — see `baseSentryOptions`.
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry";

Sentry.init(baseSentryOptions(process.env.SENTRY_DSN));
