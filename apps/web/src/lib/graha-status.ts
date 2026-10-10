// वक्री (retrograde) applies only to the classical fast/slow grahas — the Sun,
// Moon and shadow nodes (Rahu/Ketu) are never flagged (nodes are retrograde by
// convention, so marking them every day is just noise). अस्त (combust) adds the
// Moon (चन्द्र तारा अस्त). This mirrors the /graha-vakri and /graha-asta pages.
const VAKRI_GRAHAS = new Set(["mercury", "venus", "mars", "jupiter", "saturn"]);
const ASTA_GRAHAS = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "moon"]);

/** Whether a वक्री marker should show for this graha. */
export function showVakri(planetKey: string | undefined, isRetrograde?: boolean): boolean {
  return Boolean(isRetrograde) && (planetKey === undefined || VAKRI_GRAHAS.has(planetKey));
}

/** Whether an अस्त marker should show for this graha. */
export function showAsta(planetKey: string | undefined, isCombust?: boolean): boolean {
  return Boolean(isCombust) && (planetKey === undefined || ASTA_GRAHAS.has(planetKey));
}
