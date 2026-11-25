const http = require("http");
const https = require("https");
const path = require("path");
/* Sentry's wrapper around Expo's default config: stamps each bundle with a debug ID so a crash
   in a build or an EAS update maps back to the source line. */
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

/** One Three.js build for the whole bundle (avoids cjs + esm double-load warning). */
// npm hoists three to the repo root once another workspace depends on it.
const THREE_ENTRY = [
  path.resolve(__dirname, "node_modules/three/build/three.module.js"),
  path.resolve(__dirname, "../../node_modules/three/build/three.module.js"),
].find((candidate) => require("fs").existsSync(candidate));

const config = getSentryExpoConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};
config.resolver = {
  ...config.resolver,
  // `.bin` is not a Metro asset extension by default, so `require("@/assets/sky/*.cheb.bin")`
  // in `lib/sky.ts` failed to resolve even though the files are on disk. Register it.
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== "svg"), "bin"],
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

// ── Dev-only API/asset proxy (web) ────────────────────────────────────────
// The production host returns no CORS headers, so the mobile *web* build
// (served from localhost) can't read it cross-origin — true for the JSON API
// and, the same way, for the static HiPS sky tiles under `/sky3d/`, which
// three.js's TextureLoader uploads to WebGL and the browser refuses to do
// cross-origin without an Access-Control-Allow-Origin header. Forward both
// same-origin from the Metro dev server to production — the same trick the
// web app's Vite dev server uses. Native apps ignore CORS and hit the real
// host directly (see `lib/sky3d/hips.ts`'s own `HIPS_BASE_URL`), so they
// never touch this.
const API_PROXY_HOST = "www.vedicpatro.com";
const PROXIED_PATH_PREFIXES = ["/api/", "/sky3d/"];
// `npm start` sets EXPO_PUBLIC_API_BASE_URL to this Mac's Rust server (scripts/start-local.mjs):
// then `/api/*` goes there (prefix stripped, like Vite's proxy). `/sky3d/*` stays on production.
const LOCAL_API = (() => {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  try {
    return raw ? new URL(raw) : null;
  } catch {
    return null;
  }
})();
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (LOCAL_API && req.url && req.url.startsWith("/api/")) {
      const client = LOCAL_API.protocol === "https:" ? https : http;
      const base = LOCAL_API.pathname.replace(/\/$/, "");
      const upstream = client.request(
        {
          hostname: LOCAL_API.hostname,
          port: LOCAL_API.port || undefined,
          path: base + req.url.slice("/api".length),
          method: req.method,
          headers: { ...req.headers, host: LOCAL_API.host },
        },
        (upRes) => {
          res.writeHead(upRes.statusCode || 502, upRes.headers);
          upRes.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("local api proxy error: is apps/rust/scripts/dev-local.sh running?");
      });
      req.pipe(upstream);
      return;
    }
    if (req.url && PROXIED_PATH_PREFIXES.some((p) => req.url.startsWith(p))) {
      const headers = { ...req.headers, host: API_PROXY_HOST };
      // Strip localhost origin/referer so the upstream/edge doesn't reject them.
      delete headers.origin;
      delete headers.referer;
      const upstream = https.request(
        { host: API_PROXY_HOST, path: req.url, method: req.method, headers },
        (upRes) => {
          res.writeHead(upRes.statusCode || 502, upRes.headers);
          upRes.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("api proxy error");
      });
      req.pipe(upstream);
      return;
    }
    return middleware(req, res, next);
  },
};

const finalConfig = withNativeWind(config, { input: "./global.css" });
const defaultResolveRequest = finalConfig.resolver.resolveRequest;
/** The app draws with the native half of the UI kit on every platform, Expo web included. */
const UI_NATIVE_ENTRY = path.resolve(__dirname, "../../packages/ui/src/native/index.ts");

finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  /* css-interop's "upgrade" warning stringifies React elements and crashes on expo-router's navigation
     context; our copy of that one file prints the component's classes instead. */
  if (
    moduleName === "./render-component" &&
    context.originModulePath.includes(`react-native-css-interop${path.sep}dist${path.sep}runtime${path.sep}native${path.sep}`)
  ) {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "lib/css-interop/render-component.js") };
  }
  if (moduleName === "three") {
    return { type: "sourceFile", filePath: THREE_ENTRY };
  }
  if (moduleName === "@vedic-patro/ui") {
    return { type: "sourceFile", filePath: UI_NATIVE_ENTRY };
  }
  if (moduleName === "@vedic-patro/ui/motion") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "../../packages/ui/src/native/motion.ts") };
  }
  const kit = /^@vedic-patro\/ui\/kit\/([\w-]+)$/.exec(moduleName);
  if (kit) {
    return { type: "sourceFile", filePath: path.resolve(__dirname, `../../packages/ui/src/kit/${kit[1]}/native/index.ts`) };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
