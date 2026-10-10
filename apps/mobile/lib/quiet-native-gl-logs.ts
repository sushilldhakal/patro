/**
 * Metro is flooded by known native-WebGL noise that we cannot fix in app code:
 *
 * - `@react-three/fiber` 9 still constructs `THREE.Clock` per Canvas; three r183+
 *   warns on every construct. R3F v10 switches to Timer; we stay on v9.
 * - Expo GL does not implement several `pixelStorei` pnames three sets on
 *   texture upload, and logs each one.
 * - Expo GL also lacks `EXT_color_buffer_float`, which three probes at startup.
 *
 * Drop only those exact messages. Everything else still reaches the console.
 */
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "THREE.Clock: This module has been deprecated",
  "EXT_color_buffer_float extension not supported",
  "EXGL: gl.pixelStorei() doesn't support this parameter yet!",
]);
const DROP = [
  /THREE\.Clock: This module has been deprecated/,
  /THREE\.WebGLRenderer: EXT_color_buffer_float extension not supported/,
  /EXGL: gl\.pixelStorei\(\) doesn't support this parameter yet!/,
];

function isDropped(args: unknown[]): boolean {
  const text = args
    .map((arg) => (typeof arg === "string" ? arg : ""))
    .join(" ");
  return DROP.some((pattern) => pattern.test(text));
}

function wrap(method: "log" | "warn"): void {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    if (isDropped(args)) return;
    original(...args);
  };
}

wrap("log");
wrap("warn");
