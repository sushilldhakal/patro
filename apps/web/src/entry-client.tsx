import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import "./i18n/index";
import i18n from "./i18n/index";
import { syncDocumentLang } from "./lib/fonts";
import { initAnalytics } from "./lib/analytics";
import App from "./App";

syncDocumentLang(i18n.language);

initAnalytics();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Only hydrate when the served HTML was prerendered for this exact URL. When a
// path has no prerendered file the server falls back to another route's HTML
// (already swapped for the boot loader by the inline script in index.html), and
// in dev there is no prerender at all — render from scratch in both cases.
const normalize = (p: string) => p.replace(/\/+$/, "") || "/";
const ssrPath = root.getAttribute("data-ssr-path");

if (ssrPath && normalize(ssrPath) === normalize(window.location.pathname)) {
  // Prerendered pages contain date-dependent content (today's BS date,
  // calendar grid, countdowns) that will mismatch when the user visits on a
  // different day than the build. React 19 recovers automatically; we silence
  // the console noise from those expected mismatches.
  hydrateRoot(root, app, {
    onRecoverableError(error) {
      if (
        import.meta.env.DEV &&
        error instanceof Error &&
        !error.message.includes("418")
      ) {
        console.error(error);
      }
    },
  });
} else {
  root.innerHTML = "";
  createRoot(root).render(app);
}
