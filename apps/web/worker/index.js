// www.vedicpatro.com on Cloudflare Workers static assets (wrangler.jsonc). Every file is served from
// Cloudflare for free; this code runs only for /panchanga and /download (`run_worker_first`).
// /api/* and /og-image have routes with no Worker, so they still go straight to the Oracle server.

// Social crawlers get the server's share card for a shared day (the $og_crawler map in nginx).
const OG_CRAWLER =
  /facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|skypeuripreview|vkshare|embedly|mastodon|nuzzel/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") ?? "";

    if (url.pathname === "/download") {
      // Phones go straight to their store; computers and crawlers get the home page, unindexed.
      const store = /android/i.test(ua)
        ? "https://play.google.com/store/apps/details?id=com.vedicpatro.mobile"
        : /iphone|ipad|ipod/i.test(ua)
          ? "https://apps.apple.com/app/id6820382502"
          : null;
      const noCache = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store" };
      if (store) return new Response(null, { status: 302, headers: { Location: store, ...noCache } });
      const home = await env.ASSETS.fetch(new URL("/", url));
      const response = new Response(home.body, home);
      for (const [k, v] of Object.entries(noCache)) response.headers.set(k, v);
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }

    if (url.pathname === "/panchanga" && OG_CRAWLER.test(ua)) {
      return fetch(`${url.origin}/api/share/panchanga${url.search}`, { headers: { "user-agent": ua } });
    }
    return env.ASSETS.fetch(request);
  },
};
