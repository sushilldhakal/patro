import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryHistory } from "@tanstack/react-router";
import { createAppRouter } from "./router";
import App from "./App";
import { initSsrI18n } from "./i18n/ssr";
import { preloadLazyRoutes } from "./lib/lazy-route";
import { buildHeadHtml } from "./lib/seo";

export { PRERENDER_PATHS } from "./lib/seo";

export async function buildHeadHtmlForPath(pathname: string): Promise<string> {
  const i18nInstance = initSsrI18n();
  return buildHeadHtml(pathname, i18nInstance.t.bind(i18nInstance));
}

/**
 * Routes whose `validateSearch` fills in defaults (`/` → `?era=bs&language=ne`,
 * /holidays, /panchanga…) make the router answer a bare path with a redirect to
 * the canonical search instead of rendering it, which left those pages' #root
 * empty for crawlers. Follow a redirect that keeps the pathname (search only);
 * the file is still written for — and canonical to — the bare path.
 */
async function loadRouterFor(url: string) {
  let href = url;
  for (let hop = 0; hop < 3; hop += 1) {
    const router = createAppRouter(createMemoryHistory({ initialEntries: [href] }));
    await router.load();
    const location = router.state.redirect?.headers.get("Location");
    if (!location) return router;
    const next = new URL(location, "http://prerender.local");
    if (next.pathname.replace(/\/+$/, "") !== new URL(href, "http://prerender.local").pathname.replace(/\/+$/, "")) {
      throw new Error(`prerender ${url}: redirected to another page (${location})`);
    }
    href = next.pathname + next.search;
  }
  throw new Error(`prerender ${url}: too many redirects`);
}

export async function render(url: string): Promise<string> {
  initSsrI18n();
  await preloadLazyRoutes();

  const router = await loadRouterFor(url);

  return renderToString(
    <StrictMode>
      <App appRouter={router} ssr />
    </StrictMode>,
  );
}
