/**
 * Connecting lines for the नामाङ्कित वैदिक तारा that form a recognised
 * asterism rather than standing alone.
 *
 * The server already sends a single centroid point for the whole figure —
 * सप्तर्षि, प्रजापति, त्रिशङ्कु and so on (`engine/vedic/vedic_stars.py`
 * `_COMPOSITE_STARS`) — carrying the group's own name, and each member star as
 * its own catalogue entry. That centroid point already is the group's label;
 * the only thing missing on screen is the line between the members that makes
 * the shape read as one figure instead of a handful of unrelated dots.
 *
 * Only figures whose every member is *also* individually named in the server
 * catalogue are listed here — a shape with a missing vertex would look broken
 * rather than recognisable, so it is left out until that star is added there
 * too (यमुना is not in the catalogue at all yet).
 *
 * शिशुमार's eyes and ears — श्रवण/Altair, पूर्वाषाढा/Kaus Media,
 * धनिष्ठा/Sualocin, मूल/Shaula — are real members of the figure too, but they
 * sit tens of degrees from its head, in नक्षत्र the belt already names on
 * its own. A line stretched that far would read as a stray mark across the
 * sky rather than a dolphin's ear, so only the contiguous body — tail
 * through waist through jaw — is drawn here; those four keep the label they
 * already carry as नक्षत्र योगतारा instead of gaining a second, contradictory
 * one from this figure.
 */
export type VedicConstellationLink = {
  /** Member star `en` names, in the order the figure is drawn. */
  members: string[];
  /** Index pairs into `members` — the figure's own lines. */
  links: [number, number][];
};

export const VEDIC_CONSTELLATION_LINKS: VedicConstellationLink[] = [
  {
    // सप्तर्षि: the bowl closed into a quadrilateral, then the handle.
    members: ["Dubhe", "Merak", "Phecda", "Megrez", "Alioth", "Mizar", "Alkaid"],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    // शिशुमार: tail tip → tail → root of tail → waist (क्रतु, सप्तर्षि's own
    // यागतारा, is the nearest waist star to the root), then the jaw and
    // crown branching off where Draco's line actually continues past धर्म.
    members: [
      "Polaris", // ध्रुवतारा — tip of the tail
      "Thuban", // प्रजापति
      "Rastaban", // अग्नि
      "Eltanin", // इन्द्र
      "Altais", // धर्म
      "Kochab", // धाता — root of the tail
      "Pherkad", // विधाता — root of the tail
      "Dubhe", // क्रतु — सप्तर्षि, the waist
      "Edasich", // उत्तानपाद — upper jaw
      "Alsafi", // यज्ञ — lower jaw
      "Zeta Draconis", // ब्रह्मा — crown of the head
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [4, 8],
      [8, 9],
      [8, 10],
    ],
  },
];
