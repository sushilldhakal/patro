import * as Sentry from "@sentry/react";

/**
 * Crash and error reporting for vedicpatro.com. The DSN is baked in at build time from
 * `VITE_SENTRY_DSN` (the deploy passes it through from the repo's Actions secrets); with none
 * set, and always in development, nothing is sent. Source maps are uploaded by the build (see
 * vite.config.ts), so a report points at the original file and line. No personal data, no
 * session replay.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || import.meta.env.DEV) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

/** React 19 root error hooks, reporting what React catches or cannot recover from. */
export const sentryRootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
};
