/**
 * Everything in the sky that can be looked up by name, in one list.
 *
 * The search box, the browse tree, the favourites and the recents all read from
 * here, so a thing is nameable in exactly one place. Adding धूमकेतु (comets) or
 * galaxies later is a matter of adding a `kind` and a builder — nothing that
 * consumes this list needs to know what is in it.
 *
 * Every entry carries a position the camera can be aimed at. Grahas move, so
 * theirs is a key the scene resolves live; stars and asterisms are fixed, so
 * theirs is an ecliptic longitude and latitude and the scene places them the
 * same way it places anything else.
 */

import type { VedicStarPosition } from "@vedic-patro/api-client";
import { type SkyTarget, VEDIC_ALIASES, VEDIC_LATIN } from "@vedic-patro/domain/astronomy/sky3d/sky-catalogue";

export * from "@vedic-patro/domain/astronomy/sky3d/sky-catalogue";

/**
 * अश्विनौ are the Aśvins — the pair that names अश्विनी (β/γ Arietis), not
 * a third star between दिति and अदिति. An older gochar catalogue sat that
 * name on the Castor–Pollux midpoint; drop it here so a stale payload cannot
 * draw or search it.
 */
export function displayVedicStars(stars: VedicStarPosition[]): VedicStarPosition[] {
  return stars.filter((s) => s.ne !== "अश्विनौ" && s.en !== "Ashvinau");
}

/** Live server positions → search/aim targets. Ids are stable for one payload. */
export function vedicStarTargets(stars: VedicStarPosition[]): SkyTarget[] {
  const primary = displayVedicStars(stars).map((star, index) => {
    const latin = VEDIC_LATIN[star.en] ?? "";
    const hint = [latin, star.en].filter(Boolean).join(" · ");
    return {
      id: `vedic:${index}`,
      kind: "star" as const,
      ne: star.ne,
      en: star.en,
      hintNe: hint,
      hintEn: hint,
      at: "sky" as const,
      lon: star.lon,
      lat: star.lat,
      /* Already the current, live sidereal longitude the server computed for
         this exact date — not a J2000 tropical value. See {@link
         SkyTargetAt}'s own doc comment for why this has to be marked. */
      sidereal: true,
    };
  });
  const aliases: SkyTarget[] = [];
  for (const alias of VEDIC_ALIASES) {
    const host = primary.find((t) => t.ne.split(/[ /]/)[0] === alias.matchNe || t.ne === alias.matchNe);
    if (!host) continue;
    aliases.push({
      ...host,
      id: `vedic-alias:${alias.en}`,
      ne: alias.ne,
      en: alias.en,
      hintNe: host.ne,
      hintEn: alias.hintEn,
    });
  }
  return [...primary, ...aliases];
}
