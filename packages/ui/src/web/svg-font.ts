import { fontFamily } from "@vedic-patro/design-tokens";

/** Native-only (Android react-native-svg font cache); the website passes names through. */
export function setSvgFontAliases(_map: ReadonlyMap<string, string>): void {}

export function svgFont(name: string): string {
  return name;
}

export const svgFonts = {
  regular: fontFamily.native.regular,
  medium: fontFamily.native.medium,
  semibold: fontFamily.native.semibold,
  bold: fontFamily.native.bold,
};
