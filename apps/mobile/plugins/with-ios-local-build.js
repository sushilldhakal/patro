/**
 * Makes local Xcode / `expo run:ios` builds work after every `expo prebuild`.
 *
 * 1. ENABLE_USER_SCRIPT_SANDBOXING = NO on the app project. With Xcode's script sandbox on, the
 *    "Bundle React Native code and images" and Sentry "Upload Debug Symbols" phases cannot read
 *    ios/.xcode.env, .env or sentry.properties and fail with "Sandbox: bash deny file-read-data".
 *
 * 2. Local (non-EAS) builds skip the Sentry source map / debug symbol upload by writing
 *    SENTRY_DISABLE_AUTO_UPLOAD=true to ios/.xcode.env.local. EAS builds (EAS_BUILD=true) are
 *    untouched and still upload.
 */
const fs = require("fs");
const path = require("path");
const { withXcodeProject, withDangerousMod } = require("expo/config-plugins");

function withScriptSandboxOff(config) {
  return withXcodeProject(config, (cfg) => {
    const configs = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (entry && typeof entry === "object" && entry.buildSettings) {
        entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
      }
    }
    return cfg;
  });
}

function withLocalSentrySkip(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      if (process.env.EAS_BUILD) return cfg;
      const file = path.join(cfg.modRequest.platformProjectRoot, ".xcode.env.local");
      const line = "export SENTRY_DISABLE_AUTO_UPLOAD=true";
      const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (!existing.includes(line)) {
        fs.writeFileSync(file, `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${line}\n`);
      }
      return cfg;
    },
  ]);
}

module.exports = (config) => withLocalSentrySkip(withScriptSandboxOff(config));
