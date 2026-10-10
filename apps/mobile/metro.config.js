const https = require("https");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** One Three.js build for the whole bundle (avoids cjs + esm double-load warning). */
const THREE_ENTRY = path.resolve(
  __dirname,
  "node_modules/three/build/three.module.js",
);

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
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
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
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
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three") {
    return { type: "sourceFile", filePath: THREE_ENTRY };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
