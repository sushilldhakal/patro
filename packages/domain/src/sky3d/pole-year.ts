/** Shared by apps/web/src/components/sky3d/AakashGocharSky.tsx and apps/mobile/components/sky3d/AakashGocharSky.tsx (moved here from both, unchanged). */
/**
 * The year a star takes its turn as pole star, in the reader's era. Nepali gets
 * बिक्रम सम्वत्, which is where every other year in the app is quoted.
 */
export function formatPoleYear(
  year: number | undefined,
  lang: string,
  digits: (v: string | number) => string,
): string {
  if (year == null) return "";
  if (lang === "en") {
    return year < 0
      ? `${Math.abs(year).toLocaleString("en-US")} BC`
      : `AD ${year.toLocaleString("en-US")}`;
  }
  const bs = year + 57;
  const abs = digits(Math.abs(bs).toLocaleString("en-US"));
  return bs < 0 ? `${abs} बि.सं. पूर्व` : `${abs} बि.सं.`;
}
