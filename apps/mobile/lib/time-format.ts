/** HH:MM from an ISO local datetime string (no timezone conversion). */
export function localTimeShortFromIso(iso?: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : null;
}
