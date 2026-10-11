/** Shared by apps/web/src/components/panchanga/PanchangaLayout.tsx and apps/mobile/components/panchanga/PanchangaLayout.tsx (moved here from both, unchanged). */
export function rowLabel(labelKey?: string, label?: string, t?: (k: string) => string) {
  if (labelKey && t) return t(labelKey);
  return label ?? "";
}
