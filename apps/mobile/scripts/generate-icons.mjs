#!/usr/bin/env node
/** Regenerate app icons, splash, favicons, and Play/App Store artwork from public/favicon.svg. */
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public/favicon.svg");
const publicDir = join(root, "public");
const storeDir = join(root, "store/assets");
const BRAND = "#073f43";

await mkdir(publicDir, { recursive: true });
await mkdir(storeDir, { recursive: true });
await mkdir(join(root, "assets"), { recursive: true });

const svg = await readFile(svgPath, "utf8");
/** App Store rejects alpha and baked-in rounded corners — Apple applies the mask. */
const squareSvg = svg.replace('rx="116"', 'rx="0"');

async function pngFromSvg(source, size, dest, flatten = true) {
  let img = sharp(Buffer.from(source)).resize(size, size);
  if (flatten) img = img.flatten({ background: BRAND });
  await img.png().toFile(dest);
}

/** Play listing icon: exactly 512×512, 32-bit PNG, sRGB. 1024×1024 is rejected. */
async function playListingIcon(source, dest) {
  await sharp(Buffer.from(source))
    .resize(512, 512, { fit: "fill" })
    .flatten({ background: BRAND })
    .ensureAlpha()
    .toColourspace("srgb")
    .withIccProfile("srgb")
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

const icon = sharp(Buffer.from(squareSvg));

await pngFromSvg(squareSvg, 1024, join(root, "assets/icon.png"));
await pngFromSvg(squareSvg, 1024, join(storeDir, "icon-1024.png"));
await playListingIcon(squareSvg, join(storeDir, "play-icon-512.png"));

/** Adaptive icon: artwork in the centre 66% safe zone (Google Play). */
const adaptiveInner = await sharp(Buffer.from(squareSvg))
  .resize(675, 675)
  .png()
  .flatten({ background: BRAND })
  .toBuffer();
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: BRAND },
})
  .composite([{ input: adaptiveInner, gravity: "center" }])
  .png()
  .toFile(join(root, "assets/adaptive-icon.png"));

/** Splash: same mark, smaller, on brand background. */
const splashMark = await sharp(Buffer.from(squareSvg))
  .resize(512, 512)
  .png()
  .flatten({ background: BRAND })
  .toBuffer();
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: BRAND },
})
  .composite([{ input: splashMark, gravity: "center" }])
  .png()
  .toFile(join(root, "assets/splash-icon.png"));

await copyFile(svgPath, join(root, "assets/favicon.svg"));
await copyFile(svgPath, join(publicDir, "favicon.svg"));
await icon.clone().resize(32, 32).png().flatten({ background: BRAND }).toFile(join(publicDir, "favicon-32.png"));
await icon.clone().resize(180, 180).png().flatten({ background: BRAND }).toFile(join(publicDir, "apple-touch-icon.png"));

const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(
  icoSizes.map((size) =>
    sharp(Buffer.from(squareSvg)).resize(size, size).png().flatten({ background: BRAND }).toBuffer(),
  ),
);
await writeFile(join(publicDir, "favicon.ico"), await pngToIco(icoBuffers));

/** Play Store feature graphic 1024×500 — logo + name, safe margins, opaque. */
const featureSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0e6a6f"/>
      <stop offset="1" stop-color="#073f43"/>
    </linearGradient>
    <radialGradient id="glow" cx="18%" cy="48%" r="55%">
      <stop offset="0" stop-color="#f4c95e" stop-opacity=".18"/>
      <stop offset="1" stop-color="#073f43" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glow)"/>
  <text x="430" y="218" fill="#f6da8a" font-family="Noto Serif Devanagari, Noto Sans Devanagari, Georgia, serif" font-size="58" font-weight="700">वैदिक पात्रो</text>
  <text x="430" y="280" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="600">Vedic Patro</text>
  <text x="430" y="338" fill="#d4e4e4" font-family="system-ui, -apple-system, sans-serif" font-size="22">Nepali calendar · Panchanga · Kundali</text>
</svg>`;
const featureIcon = await sharp(Buffer.from(svg)).resize(280, 280).png().toBuffer();
await sharp(Buffer.from(featureSvg))
  .resize(1024, 500)
  .composite([{ input: featureIcon, left: 88, top: 110 }])
  .flatten({ background: BRAND })
  .removeAlpha()
  .png()
  .toFile(join(storeDir, "feature-graphic.png"));

const distWeb = join(root, "dist-web");
try {
  await copyFile(join(publicDir, "favicon.ico"), join(distWeb, "favicon.ico"));
  await copyFile(join(publicDir, "favicon.svg"), join(distWeb, "favicon.svg"));
  await copyFile(join(publicDir, "favicon-32.png"), join(distWeb, "favicon-32.png"));
  await copyFile(join(publicDir, "apple-touch-icon.png"), join(distWeb, "apple-touch-icon.png"));
} catch {
  // dist-web may not exist until first web export
}

console.log(
  "Updated icon.png, adaptive-icon.png, splash-icon.png, public/, store/assets/, and dist-web favicons from favicon.svg",
);
