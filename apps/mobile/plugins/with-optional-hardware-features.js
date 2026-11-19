/**
 * Play implies a required hardware feature from some manifest entries, and refuses to send a release
 * for review while those features shut out devices:
 *
 * - android.hardware.wifi: implied by the ACCESS_WIFI_STATE permission (networking libraries read the
 *   connection type). The app works on mobile data alone.
 * - android.hardware.screen.portrait: implied by ML Kit's document scanner activity, which locks
 *   itself to portrait. The app itself rotates freely ("orientation": "default").
 *
 * Declaring both with android:required="false" keeps the app installable on devices without them.
 */
const { withAndroidManifest } = require("expo/config-plugins");

const OPTIONAL_FEATURES = ["android.hardware.wifi", "android.hardware.screen.portrait"];

module.exports = function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest["uses-feature"] = manifest["uses-feature"] ?? []);
    for (const name of OPTIONAL_FEATURES) {
      const existing = features.find((f) => f.$?.["android:name"] === name);
      if (existing) existing.$["android:required"] = "false";
      else features.push({ $: { "android:name": name, "android:required": "false" } });
    }
    return cfg;
  });
};
