import { lazyPair } from "@vedic-patro/i18n/runtime";
/** Bilingual text for the day-sim chapter tour — titles, parts, transport
 * chrome, tips and still captions. Mirrors web's `learn.chapters.*` catalogue
 * keys 1:1, resolved locally instead of through i18next. */

const CHAPTER_LABELS: Record<string, [ne: string, en: string]> = {
  // Chapter titles
  welcome: lazyPair("learn.chapters.welcome"),
  stellar: lazyPair("learn.chapters.stellar"),
  solar: lazyPair("learn.chapters.solar"),
  elliptic: lazyPair("learn.chapters.elliptic"),
  axial: lazyPair("learn.chapters.axial"),
  reality: lazyPair("learn.chapters.reality"),
  playground: lazyPair("learn.chapters.playground"),
  week: lazyPair("learn.chapters.week"),
  solar_month: lazyPair("learn.chapters.solar_month"),
  lunar_month: lazyPair("learn.chapters.lunar_month"),
  year: lazyPair("learn.chapters.year"),
  rashi_belt: lazyPair("learn.chapters.rashi_belt"),
  nakshatra_belt: lazyPair("learn.chapters.nakshatra_belt"),
  pole_star: lazyPair("learn.chapters.pole_star"),
  tithi: lazyPair("learn.chapters.tithi"),
  paksha: lazyPair("learn.chapters.paksha"),
  adhik_maas: lazyPair("learn.chapters.adhik_maas"),
  five_limbs: lazyPair("learn.chapters.five_limbs"),

  // Track opening overlay
  welcome_title: lazyPair("learn.chapters.welcome_title"),
  welcome_subtitle: lazyPair("learn.chapters.welcome_subtitle"),
  day_only_subtitle: lazyPair("learn.chapters.day_only_subtitle"),
  eyebrow: lazyPair("learn.chapters.eyebrow"),
  begin: lazyPair("learn.chapters.begin"),

  // Parts (table of contents groupings)
  part_day: lazyPair("learn.chapters.part_day"),
  part_week: lazyPair("learn.chapters.part_week"),
  part_month: lazyPair("learn.chapters.part_month"),
  part_year: lazyPair("learn.chapters.part_year"),
  part_belts: lazyPair("learn.chapters.part_belts"),
  part_pole: lazyPair("learn.chapters.part_pole"),
  part_panchanga: lazyPair("learn.chapters.part_panchanga"),
  part_free: lazyPair("learn.chapters.part_free"),

  // Transport
  chapter: lazyPair("learn.chapters.chapter"),
  prev: lazyPair("learn.chapters.prev"),
  next: lazyPair("learn.chapters.next"),
  replay: lazyPair("learn.chapters.replay"),
  scrub: lazyPair("learn.chapters.scrub"),
  explore: lazyPair("learn.chapters.explore"),
  voiceover_pending: lazyPair("learn.chapters.voiceover_pending"),

  // Tips
  tip_zoom: lazyPair("learn.chapters.tip_zoom"),
  tip_drag_earth: lazyPair("learn.chapters.tip_drag_earth"),
  tip_scrub: lazyPair("learn.chapters.tip_scrub"),
  tip_layers: lazyPair("learn.chapters.tip_layers"),

  // Still captions
  still_mesha: lazyPair("learn.chapters.still_mesha"),
  still_mrigashira: lazyPair("learn.chapters.still_mrigashira"),
  still_saptarshi: lazyPair("learn.chapters.still_saptarshi"),
  still_shishumara: lazyPair("learn.chapters.still_shishumara"),
};

export function chapterLabel(key: string, lang: "ne" | "en"): string {
  const pair = CHAPTER_LABELS[key];
  if (!pair) return key;
  return lang === "en" ? pair[1] : pair[0];
}
