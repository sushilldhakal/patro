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
      try {
        const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
        if (Date.now() - lastReload > 30_000) {
          sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
          window.location.reload();
          // Keep the route suspended while the reload happens.
          return new Promise<never>(() => {});
        }
      } catch {
        /* storage unavailable — fall through to the error boundary */
      }
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
    importWithRetry(loader).then((mod) => ({ default: mod[exportName] as ComponentType<unknown> })),
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
