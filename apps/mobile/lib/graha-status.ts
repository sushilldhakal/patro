// वक्री (retrograde) — Mercury through Saturn only. अस्त (combust) includes Moon.
const VAKRI_GRAHAS = new Set(["mercury", "venus", "mars", "jupiter", "saturn"]);
const ASTA_GRAHAS = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "moon"]);

export function showVakri(planetKey: string | undefined, isRetrograde?: boolean): boolean {
  return Boolean(isRetrograde) && (planetKey === undefined || VAKRI_GRAHAS.has(planetKey));
}

export function showAsta(planetKey: string | undefined, isCombust?: boolean): boolean {
  return Boolean(isCombust) && (planetKey === undefined || ASTA_GRAHAS.has(planetKey));
}

/** True when at least one graha in the chart would render a वक्री or अस्त mark. */
export function bhavaHousesHaveStatusMarks(
  houses: { planets: { key: string; isRetrograde?: boolean; isCombust?: boolean }[] }[],
): boolean {
  return houses.some((h) =>
    h.planets.some(
      (pl) => showVakri(pl.key, pl.isRetrograde) || showAsta(pl.key, pl.isCombust),
    ),
  );
}
