// /download: phones go straight to their store; computers and crawlers get the home page, unindexed.
// Same rule as the $store_redirect map in apps/rust/deploy/nginx/vedicpatro.conf.
export async function onRequestGet({ request, env }) {
  const ua = request.headers.get("user-agent") ?? "";
  const store = /android/i.test(ua)
    ? "https://play.google.com/store/apps/details?id=com.vedicpatro.mobile"
    : /iphone|ipad|ipod/i.test(ua)
      ? "https://apps.apple.com/app/id6820382502"
      : null;
  const noCache = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store" };
  if (store) return new Response(null, { status: 302, headers: { Location: store, ...noCache } });
  const home = await env.ASSETS.fetch(new URL("/", request.url));
  const response = new Response(home.body, home);
  for (const [k, v] of Object.entries(noCache)) response.headers.set(k, v);
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
