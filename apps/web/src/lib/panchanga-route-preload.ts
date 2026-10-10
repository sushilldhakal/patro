import { importWithRetry } from "@/lib/lazy-route";

/** Path prefixes → lazy page chunks (mirrors router.tsx lazyRoute imports). */
const PATH_LOADERS: { match: RegExp; load: () => Promise<unknown> }[] = [
  { match: /^\/holidays$/, load: () => import("../pages/Holidays") },
  { match: /^\/converter$/, load: () => import("../pages/Converter") },
  { match: /^\/suryakranti$/, load: () => import("../pages/SunTimesYear") },
  { match: /^\/panchanga\/year$/, load: () => import("../pages/PanchangaYear") },
  { match: /^\/dainikkranti$/, load: () => import("../pages/DainikKranti") },
  { match: /^\/panchak-patro$/, load: () => import("../pages/PanchakPatro") },
  { match: /^\/ritu$/, load: () => import("../pages/Ritu") },
  { match: /^\/panchanga\/avakahada-chakra$/, load: () => import("../pages/AvakahadaChakra") },
  { match: /^\/abhijit-muhurta$/, load: () => import("../pages/AbhijitMuhurta") },
  { match: /^\/kundali$/, load: () => import("../pages/Kundali") },
  { match: /^\/kundali\//, load: () => import("../pages/KundaliDetail") },
  { match: /^\/jyotish\/kundali-milan$/, load: () => import("../pages/KundaliMilan") },
  { match: /^\/jyotish\/rashifal$/, load: () => import("../pages/Rashifal") },
  { match: /^\/panchanga\/details$/, load: () => import("../pages/PanchangaDetailsHub") },
  { match: /^\/panchanga\/element\//, load: () => import("../pages/ElementPage") },
  { match: /^\/gochar$/, load: () => import("../pages/Gochar") },
  { match: /^\/panchanga\/graha-asta$/, load: () => import("../pages/GrahaAsta") },
  { match: /^\/panchanga\/graha-vakri$/, load: () => import("../pages/GrahaVakri") },
  { match: /^\/panchanga\/chandra-grahan$/, load: () => import("../pages/EclipsePage") },
  { match: /^\/panchanga\/surya-grahan$/, load: () => import("../pages/EclipsePage") },
  { match: /^\/sait\//, load: () => import("../pages/SaitPage") },
];

const preloaded = new Set<string>();

function loaderForPath(pathname: string) {
  return PATH_LOADERS.find(({ match }) => match.test(pathname))?.load;
}

/** Warm the JS chunk for a sidebar destination (hover / idle prefetch). */
export function preloadPanchangaRoute(pathname: string) {
  const load = loaderForPath(pathname);
  if (!load || preloaded.has(pathname)) return;
  preloaded.add(pathname);
  void importWithRetry(load);
}

/** Prefetch all sidebar route chunks after the shell mounts. */
export function preloadAllPanchangaRoutes() {
  PATH_LOADERS.forEach(({ load }, index) => {
    const key = `panchanga-chunk-${index}`;
    if (preloaded.has(key)) return;
    preloaded.add(key);
    void importWithRetry(load);
  });
}

export function resolveSidebarLinkPath(
  to: string,
  params?: Record<string, string>,
): string {
  if (params?.name) return `/panchanga/element/${params.name}`;
  if (params?.category) return `/sait/${params.category}`;
  return to;
}
