/**
 * android:largeHeap="true": most ANRs (Sentry PATRO-K, PATRO-13) come from 3 GB phones whose
 * 192-256 MB Java heap is all but full, so the main thread waits on GC while text is laid out.
 * A large heap gives those phones room before GC stalls the UI.
 */
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$["android:largeHeap"] = "true";
    return cfg;
  });
};
