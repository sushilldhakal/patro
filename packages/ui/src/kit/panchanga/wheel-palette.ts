import { brand, illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";

/**
 * Night-sky colours for the panchanga wheel. Both drawings read these so a
 * Saturn ring, a moon shadow and a name halo cannot be typed as hex in either app.
 */
export const wheelPalette = {
  rim: withAlpha(wheel.rim, 0.5),
  sep: withAlpha(wheel.line, 0.42),
  sepSoft: withAlpha(wheel.line, 0.16),
  accent: brand.vermilion,
  ink: midnight.foam,
  inkDim: wheel.inkDim,
  inkFaint: wheel.inkFaint,
  band: illustration.green13,
  bandAlt: illustration.green17,
  rashi: illustration.green12,
  rashiAlt: illustration.green13,
  pada: wheel.sky0,
  padaAlt: wheel.sky0,
  segHot: illustration.orange22,
  segSel: illustration.orange26,
  segNow: withAlpha(brand.vermilion, 0.18),
  orbit: withAlpha(wheel.line, 0.14),
  yogaCur: withAlpha(illustration.violet70, 0.2),
  karanaCur: withAlpha(brand.vermilion, 0.16),
  tithiCur: illustration.red18,
  tithiShukla: illustration.teal15b,
  tithiKrishna: midnight.background,
  /** Saturn's ring — nearest shared gold to the artwork. */
  saturnRing: illustration.orange69,
  moonShadow: neutral.black,
  /** Planet-name halo — nearest night sky to the old teal-black stroke. */
  nameHalo: withAlpha(wheel.pada, 0.92),
} as const;
