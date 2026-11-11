/**
 * Android widgets: tell the layout how big it is.
 *
 * expo-widgets (58.0.x) renders Android widgets with Glance in `SizeMode.Exact`, so it already
 * redraws on every resize and knows the size, but it does not pass that size to the JS layout, and
 * Glance has no `weight` modifier. Without the size a month grid cannot split its width into seven
 * columns, and the layout cannot switch between its small / medium / large forms.
 *
 * This plugin adds `widthDp` and `heightDp` to the layout's environment, the way iOS passes
 * `widgetFamily`. It edits expo-widgets' Kotlin source in node_modules on every Android prebuild
 * (EAS builds run prebuild each time), and is a no-op once the line is there or if expo-widgets
 * changes the code it looks for (the layouts then fall back to their medium form).
 */
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const NEEDLE = "    val environment = getWidgetEnvironment(appContext)\n";
const PATCH =
  "    val environment = getWidgetEnvironment(appContext) + mapOf(\n" +
  '      "widthDp" to size.width.value.toDouble(),\n' +
  '      "heightDp" to size.height.value.toDouble()\n' +
  "    ) // vedic-patro: widget size\n";

function patchExpoWidgets(projectRoot) {
  let pkg;
  try {
    pkg = require.resolve("expo-widgets/package.json", { paths: [projectRoot] });
  } catch {
    return;
  }
  const file = path.join(path.dirname(pkg), "android/src/main/java/expo/modules/widgets/ExpoWidgetsPeekWidget.kt");
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("vedic-patro: widget size")) return;
  if (!src.includes(NEEDLE)) {
    console.warn("[with-android-widget-size] expo-widgets changed; widgets will not get their size.");
    return;
  }
  fs.writeFileSync(file, src.replace(NEEDLE, PATCH));
}

module.exports = function withAndroidWidgetSize(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      patchExpoWidgets(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
};

module.exports.patchExpoWidgets = patchExpoWidgets;
