/**
 * Monorepo fix: tell Android libraries where `react-native` really is.
 *
 * npm hoists `react-native` to the repo root while several native libraries stay
 * nested in apps/mobile/node_modules. Some of their build.gradle files only look
 * for `react-native` relative to themselves, find nothing, and abort the build
 * (e.g. `[react-native-picker] Unable to resolve react-native location`). They
 * all honour a root-project `REACT_NATIVE_NODE_MODULES_DIR`, so set it by asking
 * Node where `react-native` resolves from the android/ directory.
 */
const { withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "REACT_NATIVE_NODE_MODULES_DIR";

const SNIPPET = `
// Added by plugins/with-react-native-dir.js (monorepo: react-native is hoisted).
ext.REACT_NATIVE_NODE_MODULES_DIR = new File(
  ["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()
).getParentFile().getAbsolutePath()
`;

function addReactNativeDir(contents) {
  if (contents.includes(MARKER)) return contents;
  return contents.replace(/\s*$/, "\n") + SNIPPET;
}

module.exports = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("with-react-native-dir: expected a Groovy android/build.gradle");
    }
    cfg.modResults.contents = addReactNativeDir(cfg.modResults.contents);
    return cfg;
  });

module.exports.addReactNativeDir = addReactNativeDir;
