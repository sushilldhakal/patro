/**
 * Meta (Facebook) SDK for App Events only: installs and app opens reported to Meta so ad
 * campaigns can be measured. Wraps react-native-fbsdk-next's plugin and narrows it:
 *
 * - No advertising id: the IDFA is never asked for (no App Tracking Transparency prompt, no
 *   NSUserTrackingUsageDescription) and Android's advertising id is neither collected nor
 *   permitted (AD_ID is blocked). On iOS Meta measures through SKAdNetwork / Aggregated Event
 *   Measurement, which need neither.
 * - No native Facebook login screens on Android. That plugin registers FacebookActivity and a
 *   CustomTabActivity that claims the `fb<appId>://` link, which MainActivity already handles
 *   for the browser sign-in this app uses (app.json intentFilters). Two activities claiming one
 *   link breaks that sign-in, so both are taken back out.
 *
 * No JavaScript calls the SDK: it starts itself natively and logs install / activate-app on its
 * own. So an over-the-air update can never reach for a native module an older binary lacks.
 */
const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");
const facebookPlugin = require("react-native-fbsdk-next/app.plugin.js");
const withFacebook = facebookPlugin.default ?? facebookPlugin;

const FACEBOOK_ACTIVITIES = ["com.facebook.FacebookActivity", "com.facebook.CustomTabActivity"];
const AD_ID = "com.google.android.gms.permission.AD_ID";

module.exports = function withMetaAppEvents(config, { appID, clientToken, displayName }) {
  // Registered before the SDK's plugin: manifest mods run last-registered first, so this one
  // sees the manifest after the SDK's plugin has added its activities.
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.activity = (app.activity ?? []).filter((a) => !FACEBOOK_ACTIVITIES.includes(a.$?.["android:name"]));
    return cfg;
  });
  config = AndroidConfig.Permissions.withBlockedPermissions(config, [AD_ID]);
  return withFacebook(config, {
    appID,
    clientToken,
    displayName,
    scheme: `fb${appID}`,
    isAutoInitEnabled: true,
    autoLogAppEventsEnabled: true,
    advertiserIDCollectionEnabled: false,
    iosUserTrackingPermission: false,
  });
};
