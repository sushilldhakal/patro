#!/usr/bin/env node
/**
 * Prints redirect URIs to register on the Google Cloud Web OAuth client.
 * Run: node scripts/print-google-oauth-setup.mjs
 */
const appJson = require("../app.json");

const extra = appJson.expo.extra ?? {};
const webClientId = extra.googleWebClientId;
const iosClientId = extra.googleIosClientId || "";

function reversedScheme(clientId) {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

const uris = new Set([
  "http://localhost:8081/oauthredirect",
  "http://localhost:19006/oauthredirect",
  "vedicpatro:/oauthredirect",
]);

const reversed = reversedScheme(iosClientId);
if (reversed) uris.add(`${reversed}:/oauthredirect`);

console.log("Google Cloud → APIs & Services → Credentials → Web OAuth client");
console.log(`Client ID: ${webClientId || "(set googleWebClientId in app.json)"}\n`);
console.log("Authorized JavaScript origins (Expo web dev):");
console.log("  • http://localhost:8081");
console.log("  • http://localhost:19006\n");
console.log("Authorized redirect URIs (add all):");
for (const u of [...uris].sort()) console.log(`  • ${u}`);
console.log(
  "\nExpo Go cannot use Google sign-in — use npx expo run:ios / run:android (dev build).",
);
console.log("See docs/social-sign-in.md for iOS/Android OAuth client IDs.\n");
