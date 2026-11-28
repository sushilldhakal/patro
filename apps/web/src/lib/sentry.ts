import * as Sentry from "@sentry/react";
import { STALE_CHUNK } from "@/lib/lazy-route";

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
    beforeSend(event) {
      return isForeignStackOverflow(event) || isStaleChunk(event) ? null : event;
    },
  });
}

/**
 * "Maximum call stack size exceeded" with no frame from our own bundles. The Google app and
 * Chrome on iOS inject scripts into the page; their frames are reported under the page URL and
 * recurse on their own (PATRO-WEB-6, -A, -B, -C: all iOS, none with a frame in /assets/).
 */
function isForeignStackOverflow(event: Sentry.ErrorEvent): boolean {
  const values = event.exception?.values ?? [];
  const overflow = values.some((v) => v.type === "RangeError" && /Maximum call stack/i.test(v.value ?? ""));
  if (!overflow) return false;
  const frames = values.flatMap((v) => v.stacktrace?.frames ?? []);
  return !frames.some((f) => /\/assets\/[^/]+\.js/.test(f.abs_path ?? f.filename ?? ""));
}

/**
 * A page open across a deploy asks for chunks the new build deleted; lazy-route reloads it onto the
 * new build, so these are deploy noise, not defects (PATRO-WEB-2, -E, -F, -G).
 */
function isStaleChunk(event: Sentry.ErrorEvent): boolean {
  return (event.exception?.values ?? []).some((v) => STALE_CHUNK.test(v.value ?? ""));
}

/** React 19 root error hooks, reporting what React catches or cannot recover from. */
export const sentryRootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
};
