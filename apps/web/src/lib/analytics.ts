declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let initialized = false;
let loadScheduled = false;
const pendingPageViews: string[] = [];

function measurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

function flushPendingPageViews(): void {
  if (!initialized || !window.gtag) return;
  while (pendingPageViews.length > 0) {
    const path = pendingPageViews.shift()!;
    window.gtag("event", "page_view", { page_path: path });
  }
}

function onGtagReady(): void {
  initialized = true;
  flushPendingPageViews();
}

/** Fallback when the Vite HTML injection did not run (e.g. missing env at build). */
function loadGtagScript(id: string): void {
  if (loadScheduled) return;
  loadScheduled = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.onload = () => {
    window.gtag!("js", new Date());
    window.gtag!("config", id, { send_page_view: false });
    onGtagReady();
  };
  script.onerror = () => {
    loadScheduled = false;
  };
  document.head.appendChild(script);
}

/**
 * Wire up GA4. When VITE_GA_MEASUREMENT_ID is set, vite.config injects the
 * standard gtag snippet into index.html; this marks the tracker ready and
 * drains any pageviews queued before hydration.
 */
export function initAnalytics(): void {
  const id = measurementId();
  if (!id || initialized) return;

  if (typeof window.gtag === "function") {
    onGtagReady();
    return;
  }

  loadGtagScript(id);
}

export function trackPageView(path: string): void {
  if (!measurementId()) return;

  if (!initialized || !window.gtag) {
    pendingPageViews.push(path);
    initAnalytics();
    return;
  }

  window.gtag("event", "page_view", { page_path: path });
}

export function isAnalyticsEnabled(): boolean {
  return initialized && Boolean(measurementId());
}
