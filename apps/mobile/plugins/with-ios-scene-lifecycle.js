/**
 * iOS 27: adopt the UIScene life cycle.
 *
 * iOS 27 stops an app at launch (EXC_BREAKPOINT in
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) when it is built with the iOS 27
 * SDK and still uses the old app-delegate-only life cycle. Expo SDK 57 ships the scene delegate for
 * this (`ExpoAppSceneDelegate`, objc name `EXExpoAppSceneDelegate`), but its project template does
 * not switch it on yet, so this plugin does, on every prebuild (EAS regenerates ios/ each build):
 *
 * - Info.plist gets a scene manifest naming that delegate (one window, no multi-window).
 * - AppDelegate declares `ExpoReactNativeFactoryProvider` (the scene delegate reads the factory
 *   from it) and no longer makes its own window: the scene delegate creates the window and starts
 *   React Native into it. Starting it in both places would run two copies of the app.
 *
 * Safe on older iOS: the scene life cycle has been supported since iOS 13.
 */
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const SCENE_DELEGATE = "EXExpoAppSceneDelegate";

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE,
          },
        ],
      },
    };
    return cfg;
  });
}

/** The template's window-and-start block, which the scene delegate now owns. */
const START_IN_WINDOW = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function adoptScenes(contents) {
  let next = contents;
  if (!next.includes("ExpoReactNativeFactoryProvider")) {
    const declared = next.replace(
      "class AppDelegate: ExpoAppDelegate {",
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
    );
    if (declared === next) {
      throw new Error("with-ios-scene-lifecycle: AppDelegate declaration not found; update the plugin for the new template");
    }
    next = declared;
  }
  if (START_IN_WINDOW.test(next)) {
    next = next.replace(
      START_IN_WINDOW,
      "\n    // The window and React Native start in EXExpoAppSceneDelegate (plugins/with-ios-scene-lifecycle.js).\n",
    );
  } else if (next.includes("factory.startReactNative(")) {
    throw new Error("with-ios-scene-lifecycle: could not remove the app delegate's startReactNative block");
  }
  return next;
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("with-ios-scene-lifecycle: expected a Swift AppDelegate");
    }
    cfg.modResults.contents = adoptScenes(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = (config) => withSceneAppDelegate(withSceneManifest(config));
module.exports.adoptScenes = adoptScenes;
