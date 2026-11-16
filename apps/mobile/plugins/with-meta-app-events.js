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
 * - iOS start-up in AppDelegate. Android starts the SDK itself (FacebookAutoInitEnabled), but the
 *   iOS SDK has ignored that key since v9: without an explicit start it stays off and sends no
 *   install or activate-app events at all. So AppDelegate hands launch to the SDK's
 *   ApplicationDelegate, which starts it and lets it log app activations on its own.
 *
 * No JavaScript calls the SDK: it starts natively on both platforms and logs install /
 * activate-app on its own. So an over-the-air update can never reach for a native module an
 * older binary lacks.
 */
const { withAndroidManifest, withAppDelegate, AndroidConfig } = require("expo/config-plugins");
const facebookPlugin = require("react-native-fbsdk-next/app.plugin.js");
const withFacebook = facebookPlugin.default ?? facebookPlugin;

const FACEBOOK_ACTIVITIES = ["com.facebook.FacebookActivity", "com.facebook.CustomTabActivity"];
const AD_ID = "com.google.android.gms.permission.AD_ID";

const IOS_IMPORT = "import FBSDKCoreKit";
const IOS_START = "ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)";
const IOS_RETURN = "return super.application(application, didFinishLaunchingWithOptions: launchOptions)";

/** Starts the Meta SDK in AppDelegate's didFinishLaunching, just before Expo's own launch. */
function startSdkInAppDelegate(contents) {
  let next = contents;
  if (!next.includes(IOS_IMPORT)) {
    const imported = next.replace(/^((?:internal |public )?import Expo)$/m, `$1\n${IOS_IMPORT}`);
    if (imported === next) {
      throw new Error("with-meta-app-events: `import Expo` not found in AppDelegate; update the plugin for the new template");
    }
    next = imported;
  }
  if (!next.includes(IOS_START)) {
    const started = next.replace(
      IOS_RETURN,
      `// Meta App Events: the iOS SDK never starts itself (plugins/with-meta-app-events.js).\n    ${IOS_START}\n    ${IOS_RETURN}`,
    );
    if (started === next) {
      throw new Error("with-meta-app-events: didFinishLaunching return not found in AppDelegate; update the plugin for the new template");
    }
    next = started;
  }
  return next;
}

module.exports = function withMetaAppEvents(config, { appID, clientToken, displayName }) {
  // Registered before the SDK's plugin: manifest mods run last-registered first, so this one
  // sees the manifest after the SDK's plugin has added its activities.
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.activity = (app.activity ?? []).filter((a) => !FACEBOOK_ACTIVITIES.includes(a.$?.["android:name"]));
    return cfg;
  });
  config = AndroidConfig.Permissions.withBlockedPermissions(config, [AD_ID]);
  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("with-meta-app-events: expected a Swift AppDelegate");
    }
    cfg.modResults.contents = startSdkInAppDelegate(cfg.modResults.contents);
    return cfg;
  });
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
module.exports.startSdkInAppDelegate = startSdkInAppDelegate;
