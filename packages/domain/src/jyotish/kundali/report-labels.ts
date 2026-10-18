/** Shared by apps/web/src/components/kundali/KundaliReport.tsx and apps/mobile/components/kundali/KundaliReport.tsx (moved here from both, unchanged). */
/** Prefer Nepali label when the API sends "English (नेपाली)" pairs. */
export function localizeItemLabel(label: string, isEnglish: boolean): string {
  if (isEnglish) return label;
  const paired = label.match(/^(.+?) \(([^)]+)\)$/);
  if (paired) return paired[2].trim();
  const house = label.match(/^House (\d+) \(([^)]+)\)$/i);
  if (house) return `${house[2]} भाव`;
  return label;
}
