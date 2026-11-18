#!/usr/bin/env node
/**
 * react-native-svg 15 rebuilds the typeface for every <Text>/<TSpan> on every draw (TSpanView
 * applyTextPropertiesToPaint). On Android 8+ it first tries `new Typeface.Builder(assets,
 * "fonts/<family>.otf")` and then ".ttf". For a family with no asset file, each try throws and
 * catches a FileNotFoundException with a full stack trace. It also calls setFontVariationSettings.
 * That happens twice per label per frame, on the main thread. Sentry PATRO-C has the main thread
 * in setFontVariationSettings, and PATRO-D in FileNotFoundException.fillInStackTrace, both ANRs.
 *
 * Cache the finished typeface per family, weight, italic and variation settings, so it is built
 * once. The look is unchanged. This is native code, so it reaches phones with the next store
 * build, not an OTA. npm ci wipes hand edits of node_modules, so postinstall applies it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rel = "react-native-svg/android/src/main/java/com/horcrux/svg/TSpanView.java";
const MARK = "Sentry PATRO-C/PATRO-D";

const blockStart = "    Typeface typeface = null;\n    int weight = font.absoluteFontWeight;\n    final String fontFamily = font.fontFamily;\n";
const blockEnd = "    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {\n      typeface = Typeface.create(typeface, weight, isItalic);\n    }\n";
const fieldAnchor = '  private static final String TTF = ".ttf";\n';

for (const file of [join(root, "node_modules", rel), join(root, "../../node_modules", rel)]) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  if (source.includes(MARK)) continue;
  const start = source.indexOf(blockStart);
  const end = source.indexOf(blockEnd, start);
  if (start < 0 || end < 0 || !source.includes(fieldAnchor)) {
    console.warn(`patch-svg-typeface: ${rel} changed shape; typeface cache not applied`);
    continue;
  }
  const original = source.slice(start, end + blockEnd.length);
  const body = original.replace(
    "    int weight = font.absoluteFontWeight;\n    final String fontFamily = font.fontFamily;\n",
    "",
  );

  const call = `    // One typeface per family/weight/style, built once (${MARK}).
    int weight = font.absoluteFontWeight;
    final String fontFamily = font.fontFamily;
    final String cacheKey = fontFamily + "|" + weight + "|" + isItalic + "|" + style + "|" + font.fontVariationSettings;
    Typeface typeface = TYPEFACE_CACHE.get(cacheKey);
    if (typeface == null) {
      typeface = buildTypeface(font, fontFamily, weight, isItalic, style);
      if (typeface != null) TYPEFACE_CACHE.put(cacheKey, typeface);
    }
`;

  const method = `
  private Typeface buildTypeface(FontData font, String fontFamily, int weight, boolean isItalic, int style) {
${body}    return typeface;
  }

`;

  let next = source.slice(0, start) + call + source.slice(end + blockEnd.length);
  next = next.replace(
    fieldAnchor,
    `${fieldAnchor}  private static final java.util.concurrent.ConcurrentHashMap<String, Typeface> TYPEFACE_CACHE =\n      new java.util.concurrent.ConcurrentHashMap<>();\n`,
  );
  const methodAnchor = "  private void applyTextPropertiesToPaint(Paint paint, FontData font) {";
  next = next.replace(methodAnchor, method.slice(1) + methodAnchor);
  writeFileSync(file, next);
}
