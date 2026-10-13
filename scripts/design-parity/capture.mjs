#!/usr/bin/env node
/**
 * Screenshot the same page in the website and the app's web build, light and
 * dark, phone and desktop, and write a pixel-difference report.
 *
 *   npm run web                 (http://localhost:5173)
 *   npm run mobile -- --web     (http://localhost:8081)
 *   npm run check:parity
 *   npm run check:parity -- --max-diff 0.45
 *
 * Needs Playwright (`npx playwright install chromium`). Output is
 * scripts/design-parity/out/ and is not committed. The app renders through
 * react-native-web, so this checks layout, colour, spacing and type size,
 * not native font rasterisation.
 *
 * Exits 1 when --max-diff is set and any route's differing-pixel share is
 * above it. Chrome (the website header, the app's floating tab bar) is part
 * of the picture, so the threshold is a ratchet, not a demand for identical
 * pixels.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "out");
const WEB = process.env.WEB_URL ?? "http://localhost:5173";
const APP = process.env.APP_URL ?? "http://localhost:8081";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];
/** Same location and date in both, so the panchanga numbers match. */
const QUERY = "?era=bs&language=ne&lat=27.7&lon=85.3167&timezone=Asia%2FKathmandu&date=2026-10-12";
const ROUTES = [
  "/",
  "/panchanga",
  "/panchanga/details",
  "/panchanga/year",
  "/panchanga/element/tithi",
  "/panchanga/avakahada-chakra",
  "/panchanga/graha-asta",
  "/panchanga/graha-vakri",
  "/panchanga/graha-sthiti",
  "/panchanga/surya-grahan",
  "/panchanga/chandra-grahan",
  "/holidays",
  "/converter",
  "/ritu",
  "/sun-times",
  "/suryakranti",
  "/abhijit-muhurta",
  "/panchak-patro",
  "/vivah-sait",
  "/dainikkranti",
  "/gochar",
  "/aakash-gochar",
  "/kundali",
  "/jyotish/kundali-milan",
  "/jyotish/rashifal",
  "/shanti-vidhi",
  "/vastu",
  "/documents",
  "/learn",
  "/account",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
];

const args = process.argv.slice(2);
let maxDiff = null;
const routes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--max-diff") maxDiff = Number(args[++i]);
  else if (!args[i].startsWith("--")) routes.push(args[i]);
}
const selected = routes.length ? routes : ROUTES;

const { chromium } = await import("playwright").catch(() => {
  console.error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
});
const { PNG } = await import("pngjs").catch(() => ({}));
const pixelmatch = (await import("pixelmatch").catch(() => ({}))).default;

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const viewport of VIEWPORTS) {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport, colorScheme: theme, deviceScaleFactor: 1 });
    await context.addInitScript((forced) => {
      localStorage.setItem("theme", forced);
      localStorage.setItem("i18nextLng", "ne");
      localStorage.setItem("onboardingCompleted", "1");
      localStorage.setItem("onboardingCalendarEra", "bs");
      localStorage.setItem("onboardingOfflineMode", "online");
    }, theme);
    for (const route of selected) {
      const name = (route === "/" ? "home" : route.slice(1).replaceAll("/", "-")) + "." + viewport.name + "." + theme;
      const shot = async (base, suffix) => {
        const page = await context.newPage();
        const file = join(out, `${name}.${suffix}.png`);
        try {
          await page.goto(base + route + QUERY, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForTimeout(2000);
          await page.screenshot({ path: file, fullPage: false });
        } catch (error) {
          console.error(`${suffix} ${route}: ${error.message}`);
          await page.screenshot({ path: file, fullPage: false }).catch(() => {});
        }
        await page.close();
        return file;
      };
      const web = await shot(WEB, "web");
      const app = await shot(APP, "app");
      let diffShare = null;
      if (PNG && pixelmatch) {
        const { readFileSync, existsSync } = await import("node:fs");
        if (existsSync(web) && existsSync(app)) {
          const a = PNG.sync.read(readFileSync(web));
          const b = PNG.sync.read(readFileSync(app));
          if (a.width === b.width && a.height === b.height) {
            const diff = new PNG({ width: a.width, height: a.height });
            const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
            writeFileSync(join(out, `${name}.diff.png`), PNG.sync.write(diff));
            diffShare = +(n / (a.width * a.height)).toFixed(4);
          }
        }
      }
      report.push({ route, theme, viewport: viewport.name, diffShare });
      console.log(`${viewport.name.padEnd(8)} ${theme.padEnd(5)} ${route.padEnd(28)} ${diffShare ?? "(no diff)"}`);
    }
    await context.close();
  }
}
await browser.close();
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));

if (maxDiff != null) {
  const over = report.filter((row) => row.diffShare == null || row.diffShare > maxDiff);
  if (over.length) {
    console.error(`\n${over.length} page(s) above ${maxDiff} differing pixels`);
    process.exit(1);
  }
}
