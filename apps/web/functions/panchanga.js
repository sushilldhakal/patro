// /panchanga on Cloudflare Pages (scripts/pages-prep.mjs routes only this path and /download here).
// Social crawlers get the server's share card (link preview for a shared day); everyone else the page.
// Same rule as the $og_crawler map in apps/rust/deploy/nginx/vedicpatro.conf.
const OG_CRAWLER =
  /facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|skypeuripreview|vkshare|embedly|mastodon|nuzzel/i;

export function onRequestGet({ request, next }) {
  if (!OG_CRAWLER.test(request.headers.get("user-agent") ?? "")) return next();
  const url = new URL(request.url);
  // /api/* on www goes to the server (Cloudflare Origin Rule); nginx strips /api.
  return fetch(`${url.origin}/api/share/panchanga${url.search}`, {
    headers: { "user-agent": request.headers.get("user-agent") ?? "" },
  });
}
