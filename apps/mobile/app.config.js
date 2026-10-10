/**
 * Dynamic Expo config.
 *
 * Everything static lives in app.json; this wrapper only derives the native
 * OAuth URL schemes that social sign-in needs, so adding a Google client ID is
 * the *only* step required to turn native Google sign-in on:
 *
 *   extra.googleIosClientId = "1234-abc.apps.googleusercontent.com"
 *     → iOS URL scheme "com.googleusercontent.apps.1234-abc" (added below)
 *
 * The Facebook scheme (fb<appId>) is already in app.json since the app id is
 * public. See docs/social-sign-in.md for the full setup.
 */
const appJson = require("./app.json");

/** `1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`. */
function reversedGoogleClientScheme(clientId) {
  if (!clientId) return undefined;
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return undefined;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

module.exports = () => {
  // Deep clone so repeated config evaluation never accumulates schemes.
  const expo = JSON.parse(JSON.stringify(appJson.expo));
  const extra = expo.extra ?? {};

  const reversed =
    reversedGoogleClientScheme(extra.googleIosClientId) ||
    (extra.googleIosReversedClientId || undefined);

  if (reversed) {
    expo.ios = expo.ios ?? {};
    expo.ios.infoPlist = expo.ios.infoPlist ?? {};
    const urlTypes = expo.ios.infoPlist.CFBundleURLTypes ?? [];
    const already = urlTypes.some((t) => (t.CFBundleURLSchemes ?? []).includes(reversed));
    if (!already) urlTypes.push({ CFBundleURLSchemes: [reversed] });
    expo.ios.infoPlist.CFBundleURLTypes = urlTypes;
    expo.extra = { ...extra, googleIosReversedClientId: reversed };
  }

  return { expo };
};
