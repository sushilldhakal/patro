/**
 * ध्रुव तारा — the stars the Earth's axis takes turns pointing at.
 *
 * The axis does not hold still. It swings round a cone of half-angle equal to
 * the obliquity, once in about 25,800 years, so the north celestial pole walks
 * a circle through the northern constellations and whichever star it happens to
 * be passing is that age's pole star. ध्रुव (Polaris) has the job now; थुबन held
 * it when the pyramids were built, and अभिजित (Vega) takes it in about twelve
 * thousand years.
 *
 * Nothing here is a hardcoded epoch. The pole sits at ecliptic longitude 90°
 * and latitude 90° − ε *at every epoch* — that is what "precession of the
 * equinoxes" means — so a star is nearest the pole exactly when precession has
 * carried its own longitude to 90°, and {@link poleStarEpoch} solves for that
 * year. The dates fall out of the same physics that moves the ayanamsa, and
 * they land where the textbooks put them: ध्रुव 2103 AD, थुबन 2829 BC, कोचाब
 * 1101 BC, अभिजित 13,789 AD.
 *
 * Coordinates are J2000 right ascension and declination in degrees — bright
 * stars, at display accuracy. See [[nakshatra-stars]] for the same treatment
 * along the zodiac.
 */

import { equatorialToeclipticJ2000, precessionSinceJ2000 } from "@/lib/sky3d/nakshatra-stars";

export type PoleStar = {
  ne: string;
  en: string;
  /** Right ascension, J2000, degrees. */
  ra: number;
  /** Declination, J2000, degrees. */
  dec: number;
  mag: number;
};

/**
 * Every star the pole comes within about 9° of on its lap. The seven the app's
 * precession lesson already names keep the spellings used there.
 */
export const POLE_STARS: PoleStar[] = [
  { ne: "ध्रुव", en: "Polaris (α UMi)", ra: 37.9529, dec: 89.2641, mag: 1.98 },
  { ne: "थुबन", en: "Thuban (α Dra)", ra: 211.0973, dec: 64.3758, mag: 3.65 },
  { ne: "कोचाब", en: "Kochab (β UMi)", ra: 222.6764, dec: 74.1555, mag: 2.08 },
  { ne: "फर्कद", en: "Pherkad (γ UMi)", ra: 230.1822, dec: 71.834, mag: 3.05 },
  { ne: "एडासिख", en: "Edasich (ι Dra)", ra: 231.2323, dec: 58.966, mag: 3.29 },
  { ne: "तौ हर्क्युलिस", en: "τ Herculis", ra: 245.3979, dec: 46.3131, mag: 3.89 },
  { ne: "अभिजित", en: "Vega (α Lyr)", ra: 279.2347, dec: 38.7837, mag: 0.03 },
  { ne: "फवारिस", en: "Fawaris (δ Cyg)", ra: 296.2437, dec: 45.1308, mag: 2.87 },
  { ne: "डेनेब", en: "Deneb (α Cyg)", ra: 310.358, dec: 45.2803, mag: 1.25 },
  { ne: "अल्डेरामिन", en: "Alderamin (α Cep)", ra: 319.6449, dec: 62.5856, mag: 2.45 },
  { ne: "अल्फिर्क", en: "Alfirk (β Cep)", ra: 322.165, dec: 70.5607, mag: 3.23 },
  { ne: "आयोटा सेफेई", en: "ι Cephei", ra: 342.42, dec: 66.2005, mag: 3.52 },
  { ne: "एर्राई", en: "Errai (γ Cep)", ra: 354.8367, dec: 77.6323, mag: 3.21 },
];

/** ecliptic longitude of the north celestial pole — the same at every epoch. */
export const POLE_LON = 90;

/** How long one turn of the axis takes, years, at the app's precession rate. */
export const PRECESSION_PERIOD_YEARS = 360 / (1.3969713 / 100);

/** Where the pole stands, in ecliptic latitude, for an obliquity of `eps`. */
export const poleLatitude = (eps: number) => 90 - eps;

/** A pole star, converted and with its reign worked out. */
export type PoleStarPlaced = {
  ne: string;
  en: string;
  mag: number;
  /** ecliptic longitude at J2000, degrees. */
  lon: number;
  /** ecliptic latitude, degrees — fixed. */
  lat: number;
  /**
   * The Gregorian year the pole passes closest to it. Reduced into the lap that
   * contains the present, so the list reads forward from now rather than
   * scattering across ±26,000 years.
   */
  epochYear: number;
  /** How close the pole gets, degrees. Under ~1° is a true pole star. */
  missDeg: number;
};

/**
 * The year precession carries a star's longitude onto the pole's, resolved
 * into the lap nearest `aroundYear`.
 */
export function poleStarEpoch(lonJ2000: number, aroundYear = 2000): number {
  const advance = (((POLE_LON - lonJ2000) % 360) + 360) % 360;
  // 1.3969713°/century is the same rate the ayanamsa accumulates at.
  let year = 2000 + (advance / 1.3969713) * 100;
  /* Into the lap centred on `aroundYear`: the stars behind us keep their
     historical dates (थुबन in the third millennium BC) rather than being pushed
     forward to their next turn, and the ones ahead read as the future. */
  const half = PRECESSION_PERIOD_YEARS / 2;
  while (year - aroundYear > half) year -= PRECESSION_PERIOD_YEARS;
  while (aroundYear - year > half) year += PRECESSION_PERIOD_YEARS;
  return year;
}

/** The catalogue, converted to the ecliptic and dated, in order of their reign. */
export function placedPoleStars(eps: number, aroundYear = 2000): PoleStarPlaced[] {
  const poleLat = poleLatitude(eps);
  return POLE_STARS.map((s) => {
    const { lon, lat } = equatorialToeclipticJ2000(s.ra, s.dec);
    return {
      ne: s.ne,
      en: s.en,
      mag: s.mag,
      lon,
      lat,
      epochYear: poleStarEpoch(lon, aroundYear),
      missDeg: Math.abs(lat - poleLat),
    };
  }).sort((a, b) => a.epochYear - b.epochYear);
}

/**
 * Which star the pole is nearest at `dtDays` after J2000, and how far off it is
 * — the reigning ध्रुव तारा for the moment on screen.
 */
export function reigningPoleStar(
  placed: PoleStarPlaced[],
  dtDays: number,
  eps: number,
): { star: PoleStarPlaced; separationDeg: number } | null {
  if (placed.length === 0) return null;
  const precession = precessionSinceJ2000(dtDays);
  const poleLat = poleLatitude(eps);
  let best = placed[0];
  let bestSep = Infinity;
  for (const s of placed) {
    // Angular separation on the sphere between the star of date and the pole.
    const dLon = (((s.lon + precession - POLE_LON) % 360) + 540) % 360 - 180;
    const a = s.lat * (Math.PI / 180);
    const b = poleLat * (Math.PI / 180);
    const cos =
      Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dLon * (Math.PI / 180));
    const sep = Math.acos(Math.min(1, Math.max(-1, cos))) / (Math.PI / 180);
    if (sep < bestSep) {
      bestSep = sep;
      best = s;
    }
  }
  return { star: best, separationDeg: bestSep };
}

/**
 * The circle the pole itself walks: every ecliptic longitude at the pole's own
 * latitude. Drawn among the stars, it is the path — and the stars sitting on it
 * are the ones that get a turn.
 */
export function poleTrackPoints(eps: number, steps = 180): { lon: number; lat: number }[] {
  const lat = poleLatitude(eps);
  return Array.from({ length: steps + 1 }, (_, i) => ({ lon: (i / steps) * 360, lat }));
}
