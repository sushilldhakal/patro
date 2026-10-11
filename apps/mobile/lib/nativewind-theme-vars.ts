import { vars } from "nativewind";
import { mobileRoles, rgbChannels, type MobileRoles } from "@vedic-patro/design-tokens";

/**
 * Tailwind colour tokens as RGB channels, from @vedic-patro/design-tokens (the
 * same values `npm run tokens` writes into global.css for the web build).
 * NativeWind on iOS/Android does not apply .dark CSS rules; inject via vars() at runtime.
 */
function twVars(roles: MobileRoles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, hex] of Object.entries(roles)) {
    out[`--tw-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = rgbChannels(hex);
  }
  return out;
}

const LIGHT_TW_VARS = twVars(mobileRoles("light"));
const DARK_TW_VARS = twVars(mobileRoles("dark"));

export function nativeWindThemeVars(resolvedTheme: "light" | "dark") {
  return vars(resolvedTheme === "dark" ? DARK_TW_VARS : LIGHT_TW_VARS);
}
