import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { RouteSuspenseFallback } from "@/lib/route-loading";

type ModuleLoader = () => Promise<Record<string, ComponentType<unknown>>>;

const eagerCache = new Map<string, ComponentType<unknown>>();

/** Every lazyRoute's loader, so the SSR prerender can preload all of them (see preloadLazyRoutes). */
const ssrLoaders = new Map<string, ModuleLoader>();

const RELOAD_FLAG = "chunk-reload-at";

/**
 * Import a code-split chunk, reloading the page once if the fetch fails.
 * After a redeploy, clients holding the previous HTML request hashed chunk
 * URLs that no longer exist; a reload picks up the fresh manifest. The
 * timestamp guard stops a reload loop when the import is genuinely broken.
 */
/** Reload once (at most every 30 s) to pick up the new build. False when a reload just happened. */
function reloadOnce(): boolean {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - lastReload <= 30_000) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    return false; // storage unavailable: no loop guard, so no reload
  }
  window.location.reload();
  return true;
}

// A deleted hashed chunk is answered with the SPA's index.html, so Chrome also reports a MIME error (PATRO-WEB-G).
export const STALE_CHUNK =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|is not a valid JavaScript MIME type/i;

/**
 * Chunk imports outside lazyRoute/importWithRetry (Vite's preload helper, a library's own
 * `import()`) fail the same way after a redeploy, as an unhandled rejection (Sentry PATRO-WEB-2).
 * Reload once for those too.
 */
export function recoverFromStaleChunks(): void {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnce()) event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    if (STALE_CHUNK.test(message) && reloadOnce()) event.preventDefault();
  });
}

export function importWithRetry<M>(loader: () => Promise<M>): Promise<M> {
  return loader().then(
    (mod) => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* storage unavailable */
      }
      return mod;
    },
    (err: unknown) => {
      // Keep the route suspended while the reload happens; otherwise show the error boundary.
      if (reloadOnce()) return new Promise<never>(() => {});
      throw err;
    },
  );
}

/**
 * Route code-splitting for the client. During SSR prerender, modules are
 * preloaded in entry-server and resolved synchronously from eagerCache.
 */
export function lazyRoute<
  M extends Record<string, ComponentType<unknown>>,
  K extends keyof M,
>(loader: () => Promise<M>, exportName: K) {
  const key = String(exportName);

  if (import.meta.env.SSR) {
    ssrLoaders.set(key, loader as ModuleLoader);
    return function SsrRoute() {
      const Comp = eagerCache.get(key);
      if (!Comp) {
        throw new Error(`SSR route module not preloaded: ${key}`);
      }
      return <Comp />;
    };
  }

  const Lazy = lazy(() =>
    importWithRetry(loader).then((mod) => {
      // A chunk that "loads" but is not the page (the module is undefined, or lacks the export):
      // a stale or half-fetched chunk after a deploy (PATRO-WEB-D). Treat it like a failed fetch.
      const page = (mod as Record<string, ComponentType<unknown>> | undefined)?.[key];
      if (!page) {
        if (reloadOnce()) return new Promise<never>(() => {});
        throw new Error(`route chunk has no export ${key}`);
      }
      return { default: page };
    }),
  ) as LazyExoticComponent<ComponentType<unknown>>;

  return function LazyRoute() {
    return (
      <Suspense fallback={<RouteSuspenseFallback />}>
        <Lazy />
      </Suspense>
    );
  };
}

/** Called from entry-server before renderToString: loads every page module lazyRoute registered. */
export async function preloadLazyRoutes() {
  await Promise.all(
    [...ssrLoaders].map(async ([name, load]) => {
      const mod = await load();
      eagerCache.set(name, mod[name] as ComponentType<unknown>);
    }),
  );
}
