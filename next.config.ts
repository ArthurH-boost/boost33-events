import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Event covers come from the organiser's own page (Eventbrite, Luma…): any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

// Source-map upload, so a stack trace in Sentry names our files rather than the
// minified bundle. With no auth token or org set it is a build-time warning and
// uploads nothing; reporting itself is driven by the DSN alone.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
