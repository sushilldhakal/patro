import * as Sentry from "@sentry/react";

/** The nagosi/patro-web project. A DSN only lets a client send events, and it ships in every page anyway. */
const PATRO_WEB_DSN = "https://5129ff672e18ccefb0cc56e8280c8616@o4512190691934208.ingest.de.sentry.io/4512281767706704";

/**
 * Crash and error reporting for vedicpatro.com, to the patro-web project (`VITE_SENTRY_DSN`
 * overrides it). Nothing is sent in development. Source maps are uploaded by the build (see
 * vite.config.ts), so a report points at the original file and line. No personal data, no
 * session replay.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim() || PATRO_WEB_DSN;
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
