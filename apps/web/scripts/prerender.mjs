/**
 * Build-time static pre-rendering: React SSR → one HTML file per public route.
 * Runs after client + server Vite builds. Output stays in dist/ for nginx.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");

const { render, PRERENDER_PATHS, buildHeadHtmlForPath } = await import(
  join(root, "dist/server/entry-server.js")
);

const template = readFileSync(join(distDir, "index.html"), "utf8");

function inject(templateHtml, pathname, appHtml, headHtml) {
  let html = templateHtml;

  html = html.replace(/<title>[^<]*<\/title>\s*/i, "");
  html = html.replace(/<meta name="description"[^>]*>\s*/i, "");
  html = html.replace("</head>", `    ${headHtml}\n  </head>`);

  const rootOpen = '<div id="root">';
  const rootIdx = html.indexOf(rootOpen);
  if (rootIdx === -1) {
    throw new Error("Could not find #root in index.html");
  }
  const afterOpen = rootIdx + rootOpen.length;
  const rootClose = "</div>";
  const closeIdx = html.indexOf(rootClose, afterOpen);
  if (closeIdx === -1) {
    throw new Error("Could not find closing #root in index.html");
  }

  // data-ssr-path lets the client detect when this file was served as the SPA
  // fallback for a different URL (see the boot-loader script in index.html).
  const rootOpenTagged = `<div id="root" data-ssr-path="${pathname}">`;
  html = html.slice(0, rootIdx) + rootOpenTagged + appHtml + html.slice(closeIdx);
  return html;
}

function outFileForPath(pathname) {
  if (pathname === "/") return join(distDir, "index.html");
  const trimmed = pathname.replace(/^\//, "").replace(/\/$/, "");
  return join(distDir, trimmed, "index.html");
}

let ok = 0;
let failed = 0;

for (const pathname of PRERENDER_PATHS) {
  try {
    const appHtml = await render(pathname);
    const headHtml = await buildHeadHtmlForPath(pathname);
    const html = inject(template, pathname, appHtml, headHtml);
    const outPath = outFileForPath(pathname);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf8");
    ok += 1;
    console.log(`  prerendered ${pathname}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAILED ${pathname}:`, err);
  }
}

console.log(`\nPrerender complete: ${ok} ok, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

// SSR bundle imports App code (QueryClient, i18n, etc.) that keeps the event loop
// alive; without this, `npm run build` never returns and CI deploy hangs after prerender.
process.exit(0);
