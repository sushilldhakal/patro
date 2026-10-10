/**
 * The 27 नक्षत्र as they actually stand in the sky — the star groups the names
 * were given to, not the glyphs.
 *
 * Each entry leads with its **योगतारा** (junction star): the one star the
 * classical texts measure the nakshatra's position by — रोहिणी *is* Aldebaran,
 * चित्रा *is* Spica, ज्येष्ठा *is* Antares — followed by the companions that
 * make the shape recognisable, and the lines that join them.
 *
 * Coordinates are J2000 right ascension and declination in degrees, converted
 * to the ecliptic here and precessed to the simulated date by the scene. This
 * is a **display catalogue**, hand-assembled at bright-star accuracy — good to
 * a few arcminutes, which is far below anything visible at this scale, but it
 * is not an astrometric source and proper motion is ignored entirely.
 *
 * Note what the sky does and the drawing therefore must: a fixed star does not
 * move in the sidereal frame the rashi belt is drawn in. Both drift *together*
 * against the equinox, at the rate of the ayanamsa — which is why the belt and
 * these stars stay locked to each other while वसन्त सम्पात walks away from the
 * start of मेष over the centuries.
 */

/**
 * Traditional Nepali names for stars that have one of their own — not the
 * नक्षत्र they sit in. Overlay and search prefer these when the UI is Nepali.
 */
const STAR_NAME_NE: Record<string, string> = {
  Pollux: "दिति",
  Castor: "अदिति",
  // हस्त नक्षत्रका पाँच तारा — योगतारा (Algorab) आफैं हस्त हो; बाँकी चार साथी तारा।
  Gienah: "सवितृ",
  Minkar: "अर्थवा",
  Kraz: "प्रभा",
  Alchiba: "साध्य",
};

/**
 * The name drawn on the sky: the proper / common name inside `(…)`, never the
 * Bayer/Flamsteed/Messier tag. `β Gem (Pollux)` → Pollux; `σ Hya` → none.
 */
export function skyStarCommonName(catalogueName: string): string | null {
  const paren = /\(([^)]+)\)\s*$/.exec(catalogueName);
  if (paren?.[1]) return paren[1].trim();
  if (/^M\d+\b/.test(catalogueName)) return null;
  if (/[αβγδεζηθικλμνξοπρστυφχψω]/.test(catalogueName)) return null;
  if (/^\d+\s+[A-Z]/.test(catalogueName)) return null;
  if (/^[A-Za-z]{1,3}[¹²³]?\s+[A-Z]/.test(catalogueName)) return null;
  return catalogueName;
}

export function skyStarNameNe(catalogueName: string): string | undefined {
  const common = skyStarCommonName(catalogueName);
  return common ? STAR_NAME_NE[common] : undefined;
}

/** One catalogued star. Magnitude only sets how big it is drawn. */
export type SkyStar = {
  /** Catalogue string — Bayer plus proper name in parentheses when there is one. */
  name: string;
  /** Right ascension, J2000, degrees. */
  ra: number;
  /** Declination, J2000, degrees. */
  dec: number;
  /** Apparent visual magnitude. */
  mag: number;
};

export type NakshatraAsterism = {
  /** 1–27, अश्विनी first. */
  index: number;
  ne: string;
  en: string;
  /** The योगतारा is always `stars[0]`. */
  stars: SkyStar[];
  /** Index pairs into `stars` — the figure's own lines. */
  links: [number, number][];
};

/* A chain: 0–1–2–…, the commonest asterism shape. */
const chain = (n: number): [number, number][] =>
  Array.from({ length: n - 1 }, (_, i) => [i, i + 1] as [number, number]);

export const NAKSHATRA_ASTERISMS: NakshatraAsterism[] = [
  {
    index: 1,
    ne: "अश्विनी",
    en: "Ashvini",
    stars: [
      { name: "β Ari (Sheratan)", ra: 28.66, dec: 20.808, mag: 2.64 },
      { name: "γ Ari (Mesarthim)", ra: 28.38, dec: 19.294, mag: 3.86 },
      { name: "α Ari (Hamal)", ra: 31.793, dec: 23.462, mag: 2.0 },
    ],
    links: [
      [1, 0],
      [0, 2],
    ],
  },
  {
    index: 2,
    ne: "भरणी",
    en: "Bharani",
    stars: [
      { name: "41 Ari", ra: 42.496, dec: 27.261, mag: 3.61 },
      { name: "39 Ari", ra: 41.706, dec: 29.247, mag: 4.51 },
      { name: "35 Ari", ra: 40.501, dec: 27.706, mag: 4.65 },
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  },
  {
    index: 3,
    ne: "कृत्तिका",
    en: "Krittika",
    stars: [
      { name: "η Tau (Alcyone)", ra: 56.871, dec: 24.105, mag: 2.87 },
      { name: "27 Tau (Atlas)", ra: 57.291, dec: 24.053, mag: 3.63 },
      { name: "17 Tau (Electra)", ra: 56.219, dec: 24.113, mag: 3.7 },
      { name: "20 Tau (Maia)", ra: 56.457, dec: 24.368, mag: 3.87 },
      { name: "23 Tau (Merope)", ra: 56.582, dec: 23.948, mag: 4.14 },
      { name: "19 Tau (Taygeta)", ra: 56.302, dec: 24.467, mag: 4.3 },
    ],
    links: [
      [2, 3],
      [3, 0],
      [0, 1],
      [0, 4],
      [3, 5],
    ],
  },
  {
    index: 4,
    ne: "रोहिणी",
    en: "Rohini",
    stars: [
      { name: "α Tau (Aldebaran)", ra: 68.98, dec: 16.509, mag: 0.87 },
      { name: "θ¹ Tau", ra: 67.166, dec: 15.871, mag: 3.84 },
      { name: "γ Tau", ra: 64.948, dec: 15.628, mag: 3.65 },
      { name: "δ¹ Tau", ra: 65.734, dec: 17.542, mag: 3.76 },
      { name: "ε Tau", ra: 67.154, dec: 19.18, mag: 3.53 },
    ],
    links: [
      [2, 1],
      [1, 0],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
  {
    index: 5,
    ne: "मृगशीर्षा",
    en: "Mrigashira",
    stars: [
      { name: "λ Ori (Meissa)", ra: 83.784, dec: 9.934, mag: 3.39 },
      { name: "φ¹ Ori", ra: 83.181, dec: 9.489, mag: 4.39 },
      { name: "φ² Ori", ra: 83.859, dec: 9.292, mag: 4.09 },
    ],
    links: [
      [1, 0],
      [0, 2],
      [2, 1],
    ],
  },
  {
    index: 6,
    ne: "आर्द्रा",
    en: "Ardra",
    stars: [{ name: "α Ori (Betelgeuse)", ra: 88.793, dec: 7.407, mag: 0.45 }],
    links: [],
  },
  {
    index: 7,
    ne: "पुनर्वसु",
    en: "Punarvasu",
    stars: [
      { name: "β Gem (Pollux)", ra: 116.329, dec: 28.026, mag: 1.16 },
      { name: "α Gem (Castor)", ra: 113.65, dec: 31.888, mag: 1.58 },
    ],
    links: [[0, 1]],
  },
  {
    index: 8,
    ne: "पुष्य",
    en: "Pushya",
    stars: [
      { name: "δ Cnc (Asellus Australis)", ra: 131.171, dec: 18.154, mag: 3.94 },
      { name: "γ Cnc (Asellus Borealis)", ra: 130.821, dec: 21.469, mag: 4.66 },
      { name: "θ Cnc", ra: 130.026, dec: 18.096, mag: 5.33 },
      { name: "M44 (Praesepe)", ra: 130.1, dec: 19.667, mag: 3.7 },
    ],
    links: [
      [2, 0],
      [0, 3],
      [3, 1],
    ],
  },
  {
    index: 9,
    ne: "आश्रेषा",
    en: "Ashlesha",
    stars: [
      { name: "ε Hya", ra: 133.847, dec: 6.419, mag: 3.38 },
      { name: "δ Hya", ra: 131.694, dec: 5.704, mag: 4.14 },
      { name: "σ Hya (Minchir)", ra: 132.989, dec: 3.342, mag: 4.44 },
      { name: "η Hya", ra: 133.113, dec: 3.399, mag: 4.3 },
      { name: "ρ Hya", ra: 133.376, dec: 5.841, mag: 4.35 },
      { name: "ζ Hya", ra: 135.62, dec: 5.946, mag: 3.11 },
    ],
    links: [
      [1, 4],
      [4, 0],
      [0, 5],
      [3, 2],
      [3, 0],
    ],
  },
  {
    index: 10,
    ne: "मघा",
    en: "Magha",
    stars: [
      { name: "α Leo (Regulus)", ra: 152.093, dec: 11.967, mag: 1.36 },
      { name: "η Leo", ra: 151.833, dec: 16.763, mag: 3.51 },
      { name: "γ Leo (Algieba)", ra: 154.993, dec: 19.842, mag: 2.01 },
      { name: "ζ Leo (Adhafera)", ra: 154.173, dec: 23.417, mag: 3.43 },
      { name: "μ Leo", ra: 152.647, dec: 26.007, mag: 3.88 },
      { name: "ε Leo", ra: 146.463, dec: 23.774, mag: 2.98 },
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },
  {
    index: 11,
    ne: "पूर्व फाल्गुनी",
    en: "Purva Phalguni",
    stars: [
      { name: "δ Leo (Zosma)", ra: 168.527, dec: 20.524, mag: 2.56 },
      { name: "θ Leo (Chertan)", ra: 168.56, dec: 15.43, mag: 3.33 },
    ],
    links: [[0, 1]],
  },
  {
    index: 12,
    ne: "उत्तर फाल्गुनी",
    en: "Uttara Phalguni",
    stars: [
      { name: "β Leo (Denebola)", ra: 177.265, dec: 14.572, mag: 2.14 },
      { name: "93 Leo", ra: 176.3, dec: 20.219, mag: 4.5 },
    ],
    links: [[0, 1]],
  },
  {
    index: 13,
    ne: "हस्त",
    en: "Hasta",
    stars: [
      { name: "δ Crv (Algorab)", ra: 187.466, dec: -16.516, mag: 2.95 },
      { name: "γ Crv (Gienah)", ra: 183.952, dec: -17.542, mag: 2.59 },
      { name: "ε Crv (Minkar)", ra: 182.532, dec: -22.62, mag: 3.02 },
      { name: "β Crv (Kraz)", ra: 188.597, dec: -23.397, mag: 2.65 },
      { name: "α Crv (Alchiba)", ra: 182.103, dec: -24.729, mag: 4.02 },
    ],
    links: [
      [1, 0],
      [0, 3],
      [3, 2],
      [2, 1],
      [2, 4],
    ],
  },
  {
    index: 14,
    ne: "चित्रा",
    en: "Chitra",
    stars: [{ name: "α Vir (Spica)", ra: 201.298, dec: -11.161, mag: 0.98 }],
    links: [],
  },
  {
    index: 15,
    ne: "स्वाति",
    en: "Swati",
    stars: [{ name: "α Boo (Arcturus)", ra: 213.915, dec: 19.182, mag: -0.05 }],
    links: [],
  },
  {
    index: 16,
    ne: "विशाखा",
    en: "Vishakha",
    stars: [
      { name: "α² Lib (Zubenelgenubi)", ra: 222.72, dec: -16.042, mag: 2.75 },
      { name: "β Lib (Zubeneschamali)", ra: 229.252, dec: -9.383, mag: 2.61 },
      { name: "γ Lib", ra: 233.881, dec: -14.789, mag: 3.91 },
      { name: "ι Lib", ra: 234.664, dec: -19.791, mag: 4.54 },
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  {
    index: 17,
    ne: "अनुराधा",
    en: "Anuradha",
    stars: [
      { name: "δ Sco (Dschubba)", ra: 240.083, dec: -22.622, mag: 2.29 },
      { name: "β¹ Sco (Acrab)", ra: 241.359, dec: -19.805, mag: 2.56 },
      { name: "π Sco", ra: 239.713, dec: -26.114, mag: 2.89 },
      { name: "ρ Sco", ra: 239.221, dec: -29.214, mag: 3.87 },
    ],
    links: chain(4),
  },
  {
    index: 18,
    ne: "ज्येष्ठा",
    en: "Jyeshtha",
    stars: [
      { name: "α Sco (Antares)", ra: 247.352, dec: -26.432, mag: 1.06 },
      { name: "σ Sco", ra: 245.297, dec: -25.593, mag: 2.9 },
      { name: "τ Sco", ra: 248.971, dec: -28.216, mag: 2.82 },
    ],
    links: [
      [1, 0],
      [0, 2],
    ],
  },
  {
    index: 19,
    ne: "मूल",
    en: "Mula",
    stars: [
      { name: "λ Sco (Shaula)", ra: 263.402, dec: -37.104, mag: 1.62 },
      { name: "υ Sco (Lesath)", ra: 262.691, dec: -37.296, mag: 2.7 },
      { name: "κ Sco", ra: 265.622, dec: -39.03, mag: 2.41 },
      { name: "ι¹ Sco", ra: 266.896, dec: -40.127, mag: 3.03 },
      { name: "θ Sco (Sargas)", ra: 264.33, dec: -42.998, mag: 1.86 },
      { name: "ζ² Sco", ra: 253.646, dec: -42.362, mag: 3.62 },
      { name: "ε Sco", ra: 252.541, dec: -34.293, mag: 2.29 },
    ],
    links: [
      [1, 0],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    index: 20,
    ne: "पूर्वाषाढा",
    en: "Purvashada",
    stars: [
      { name: "δ Sgr (Kaus Media)", ra: 275.249, dec: -29.828, mag: 2.7 },
      { name: "ε Sgr (Kaus Australis)", ra: 276.043, dec: -34.385, mag: 1.85 },
    ],
    links: [[0, 1]],
  },
  {
    index: 21,
    ne: "उत्तराषाढा",
    en: "Uttarashada",
    stars: [
      { name: "σ Sgr (Nunki)", ra: 283.816, dec: -26.297, mag: 2.05 },
      { name: "ζ Sgr (Ascella)", ra: 285.653, dec: -29.88, mag: 2.6 },
      { name: "τ Sgr", ra: 286.173, dec: -27.67, mag: 3.32 },
      { name: "φ Sgr", ra: 281.414, dec: -26.991, mag: 3.17 },
    ],
    links: [
      [3, 0],
      [0, 2],
      [2, 1],
    ],
  },
  {
    index: 22,
    ne: "श्रवण",
    en: "Shravana",
    stars: [
      { name: "α Aql (Altair)", ra: 297.696, dec: 8.868, mag: 0.76 },
      { name: "β Aql (Alshain)", ra: 298.828, dec: 6.407, mag: 3.71 },
      { name: "γ Aql (Tarazed)", ra: 296.565, dec: 10.613, mag: 2.72 },
    ],
    links: [
      [1, 0],
      [0, 2],
    ],
  },
  {
    index: 23,
    ne: "धनिष्ठा",
    en: "Dhanishta",
    stars: [
      { name: "β Del (Rotanev)", ra: 309.387, dec: 14.595, mag: 3.63 },
      { name: "α Del (Sualocin)", ra: 309.909, dec: 15.912, mag: 3.77 },
      { name: "γ² Del", ra: 311.663, dec: 16.124, mag: 4.27 },
      { name: "δ Del", ra: 310.864, dec: 15.075, mag: 4.43 },
      { name: "ε Del (Aldulfin)", ra: 308.303, dec: 11.303, mag: 4.03 },
    ],
    links: [
      [4, 0],
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  {
    index: 24,
    ne: "शतभिषा",
    en: "Shatabhisha",
    stars: [
      { name: "λ Aqr", ra: 343.153, dec: -7.579, mag: 3.73 },
      { name: "γ Aqr (Sadachbia)", ra: 337.876, dec: -1.387, mag: 3.84 },
      { name: "ζ Aqr", ra: 337.211, dec: -0.02, mag: 3.65 },
      { name: "η Aqr", ra: 338.839, dec: -0.117, mag: 4.02 },
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    index: 25,
    ne: "पूर्वभाद्रपदा",
    en: "Purva Bhadrapada",
    stars: [
      { name: "α Peg (Markab)", ra: 346.19, dec: 15.205, mag: 2.48 },
      { name: "β Peg (Scheat)", ra: 345.944, dec: 28.083, mag: 2.42 },
    ],
    links: [[0, 1]],
  },
  {
    index: 26,
    ne: "उत्तरभाद्रपदा",
    en: "Uttara Bhadrapada",
    stars: [
      { name: "γ Peg (Algenib)", ra: 3.309, dec: 15.184, mag: 2.83 },
      { name: "α And (Alpheratz)", ra: 2.097, dec: 29.091, mag: 2.06 },
    ],
    links: [[0, 1]],
  },
  {
    index: 27,
    ne: "रेवती",
    en: "Revati",
    stars: [
      { name: "ζ Psc", ra: 18.433, dec: 7.575, mag: 5.21 },
      { name: "η Psc (Alpherg)", ra: 22.871, dec: 15.346, mag: 3.62 },
      { name: "ε Psc", ra: 17.696, dec: 7.89, mag: 4.27 },
      { name: "δ Psc", ra: 11.708, dec: 7.585, mag: 4.43 },
      { name: "ι Psc", ra: 354.99, dec: 5.626, mag: 4.13 },
      { name: "θ Psc", ra: 348.6, dec: 6.379, mag: 4.28 },
      { name: "γ Psc", ra: 349.291, dec: 3.282, mag: 3.69 },
    ],
    links: [
      [1, 0],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
];

/**
 * Short labels for the belt, index 0 = अश्विनी.
 *
 * Full names collide badly at 13°20′ apart — उत्तरभाद्रपदा alone is wider than
 * its own nakshatra at most zooms — so the sky uses these. Four letters where
 * four will do, and the पूर्व/उत्तर pairs keep the प/उ prefix that tells them
 * apart, which is how an almanac abbreviates them too: पू.फा against उ.फा.
 */
export const NAKSHATRA_SHORT: { ne: string; en: string }[] = [
  { ne: "अश्वि", en: "Ashv" },
  { ne: "भर", en: "Bhar" },
  { ne: "कृत्ति", en: "Krit" },
  { ne: "रोहि", en: "Rohi" },
  { ne: "मृग", en: "Mrig" },
  { ne: "आर्द्रा", en: "Ardra" },
  { ne: "पुन", en: "Punar" },
  { ne: "पुष्य", en: "Push" },
  { ne: "आश्रे", en: "Ashl" },
  { ne: "मघा", en: "Magh" },
  { ne: "पू.फा", en: "PPha" },
  { ne: "उ.फा", en: "UPha" },
  { ne: "हस्त", en: "Hast" },
  { ne: "चित्रा", en: "Chit" },
  { ne: "स्वाति", en: "Swat" },
  { ne: "विशा", en: "Vish" },
  { ne: "अनु", en: "Anur" },
  { ne: "ज्येष्ठा", en: "Jyes" },
  { ne: "मूल", en: "Mula" },
  { ne: "पू.षा", en: "PSha" },
  { ne: "उ.षा", en: "USha" },
  { ne: "श्रव", en: "Shra" },
  { ne: "धनि", en: "Dhan" },
  { ne: "शत", en: "Shat" },
  { ne: "पू.भा", en: "PBha" },
  { ne: "उ.भा", en: "UBha" },
  { ne: "रेव", en: "Reva" },
];

const DEG = Math.PI / 180;
/** Obliquity of the ecliptic at J2000, degrees — the catalogue's own frame. */
const EPS_J2000 = 23.4392911;

/** Equatorial J2000 → ecliptic J2000, both in degrees. */
export function equatorialToeclipticJ2000(ra: number, dec: number): { lon: number; lat: number } {
  const a = ra * DEG;
  const d = dec * DEG;
  const e = EPS_J2000 * DEG;
  const sinLat = Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a);
  const y = Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e);
  const lon = Math.atan2(y, Math.cos(a)) / DEG;
  return { lon: ((lon % 360) + 360) % 360, lat: Math.asin(sinLat) / DEG };
}

/**
 * General precession in ecliptic longitude since J2000, degrees.
 *
 * A star's ecliptic latitude barely moves; its longitude climbs at about 50″ a
 * year, and this is the same quantity the ayanamsa accumulates — which is why
 * feeding both from the same physics keeps the belt glued to these stars.
 */
export function precessionSinceJ2000(daysSinceJ2000: number): number {
  const T = daysSinceJ2000 / 36525;
  return 1.3969713 * T + 0.0003086 * T * T;
}

/** One star, flattened out of the asterism list and pre-converted. */
export type FlatStar = {
  /** ecliptic longitude at J2000, degrees. */
  lon: number;
  /** ecliptic latitude, degrees — treated as fixed. */
  lat: number;
  mag: number;
  /** 1–27: which nakshatra it belongs to. */
  nakshatra: number;
  /** True for the योगतारा, which is drawn larger. */
  junction: boolean;
  /** Catalogue string — kept stable for search/favourite ids. */
  name: string;
  /** Common / proper name for the overlay. Null when the catalogue has only a Bayer tag. */
  nameEn: string | null;
  /** Traditional Nepali name when the star has one of its own. */
  nameNe: string | null;
};

/** Every catalogued star in one array, with the link pairs re-indexed onto it. */
export function flattenAsterisms(): { stars: FlatStar[]; links: [number, number][] } {
  const stars: FlatStar[] = [];
  const links: [number, number][] = [];
  for (const nak of NAKSHATRA_ASTERISMS) {
    const base = stars.length;
    for (let i = 0; i < nak.stars.length; i += 1) {
      const s = nak.stars[i];
      const { lon, lat } = equatorialToeclipticJ2000(s.ra, s.dec);
      stars.push({
        lon,
        lat,
        mag: s.mag,
        nakshatra: nak.index,
        junction: i === 0,
        name: s.name,
        nameEn: skyStarCommonName(s.name),
        nameNe: skyStarNameNe(s.name) ?? null,
      });
    }
    for (const [a, b] of nak.links) links.push([base + a, base + b]);
  }
  return { stars, links };
}

/** Overlay copy for one नक्षत्र member. Companions without a common name stay unlabeled. */
export function starOverlayNames(
  star: Pick<FlatStar, "junction" | "nameEn" | "nameNe">,
  nak: Pick<NakshatraAsterism, "ne" | "en">,
): { en: string; ne: string } | null {
  /* Never put an English proper name in `ne`. Acrab / Aldulfin have no
     traditional Nepali name — they stay unlabeled when the UI is Nepali,
     rather than leaking Latin onto the sky. योगतारा without its own name
     still takes the नक्षत्र's. */
  const en = star.nameEn ?? (star.junction ? nak.en : null);
  const ne = star.nameNe ?? (star.junction ? nak.ne : null);
  if (!en && !ne) return null;
  return { en: en ?? "", ne: ne ?? "" };
}
