/**
 * The gochar planet cards and the one-planet deep dive, shared by the
 * website's and the app's `components/gochar/GocharSkySection.tsx` and
 * `GocharPlanetDeepDive.tsx` (gochar and aakash gochar pages): each planet's
 * name, sign and degree, flags, nakshatra, motion, speed and the windows
 * until its next sign / nakshatra / pada, and copy.
 */
import type { GocharGraha } from "@vedic-patro/api-client";
import { grahaRashiDisplay } from "@vedic-patro/read-models/jyotish/dainikKranti/gochar-display";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
  speedTone,
} from "@vedic-patro/read-models/jyotish/gochar-page-utils";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type GocharSkyCard = {
  key: GrahaKey;
  name: string;
  rashi: string;
  deg: string;
  exalted: boolean;
  isRetrograde?: boolean;
  isCombust?: boolean;
  nakshatra: string;
  motion: string;
  /** "In <rashi> until <date>", when the next sign entry is known. */
  footer: string | null;
  /** The Moon's card only: Moon-minus-Sun longitude in degrees (0 औंसी, 180 पूर्णिमा), so its icon can show the phase. */
  elongation?: number;
};

/** A graha's sidereal longitude, from the field or — failing that — its sign and degree. */
function grahaLongitude(g: GocharGraha | undefined): number | undefined {
  if (!g) return undefined;
  if (g.longitude != null && Number.isFinite(g.longitude)) return g.longitude;
  if (g.rashi_no != null && g.deg_in_rashi != null) return (g.rashi_no - 1) * 30 + g.deg_in_rashi;
  return undefined;
}

/** Moon − Sun, wrapped to 0–360; `undefined` when either longitude is missing. */
function moonElongation(gochar: Record<string, GocharGraha>): number | undefined {
  const moon = grahaLongitude(gochar.moon);
  const sun = grahaLongitude(gochar.sun);
  if (moon == null || sun == null) return undefined;
  return (((moon - sun) % 360) + 360) % 360;
}

function useGocharLabels() {
  const { t, lang, digits } = useLocale();
  const nameOf = (key: GrahaKey) => bilingualText(lang, GRAHA_NAME[key].ne, GRAHA_NAME[key].en);
  const degOf = (g: GocharGraha) => (g.deg_in_rashi != null ? `${digits(g.deg_in_rashi.toFixed(1))}°` : "—");
  return { t, lang, digits, nameOf, degOf };
}

/** Every planet's card for the "sky at a glance" grid. */
export function useGocharSkyCards(gochar: Record<string, GocharGraha>) {
  const { t, lang, digits, nameOf, degOf } = useGocharLabels();
  const cards: GocharSkyCard[] = [];
  for (const key of GRAHA_DETAIL_ORDER) {
    const g = gochar[key];
    if (!g) continue;
    const rashi = grahaRashiDisplay(g, lang);
    const untilAd = g.next_rashi_entry?.entry_time_local?.slice(0, 10);
    const rashiUntil = rashi ?? (lang === "en" ? g.rashi : g.rashi_ne);
    cards.push({
      key,
      name: nameOf(key),
      rashi: rashi ?? "",
      deg: degOf(g),
      exalted: grahaExalted(key, g),
      isRetrograde: g.is_retrograde,
      isCombust: g.is_combust,
      nakshatra: grahaNakshatraLine(g, lang, digits),
      motion: motionLabel(g, lang),
      footer: untilAd
        ? t("ui.gochar.in_rashiuntil_until_lang", { rashiUntil, lang: formatGocharPatroDate(untilAd, lang) })
        : null,
      ...(key === "moon" ? { elongation: moonElongation(gochar) } : {}),
    });
  }
  return {
    cards,
    copy: {
      eyebrow: t("ui.gochar.the_sky_at_a_glance"),
      title: t("ui.gochar.live_graha_positions"),
      exalted: t("ui.gochar.exalted"),
      nakshatra: t("nakshatra"),
      motion: t("ui.gochar.motion"),
    },
  };
}

/** The deep dive: the planet picker and the selected planet's facts and windows. */
export function useGocharDeepDive(gochar: Record<string, GocharGraha>, selected: GrahaKey) {
  const { t, lang, nameOf, degOf } = useGocharLabels();
  const g = gochar[selected];
  const windowLine = (label: string, entryLocal: string | undefined) =>
    entryLocal ? t("gochar.window_until", { label, when: formatGocharPatroDate(entryLocal.slice(0, 10), lang) }) : undefined;
  const en = lang === "en";

  return {
    picker: GRAHA_DETAIL_ORDER.filter((key) => gochar[key]).map((key) => ({ key, name: nameOf(key), active: key === selected })),
    detail: g
      ? {
          key: selected,
          name: nameOf(selected),
          vedicName: g.name_vedic ?? null,
          exalted: grahaExalted(selected, g),
          facts: [
            { key: "sign", label: t("ui.gochar.sign"), value: `${grahaRashiDisplay(g, lang) ?? ""} ${degOf(g)}` },
            { key: "nakshatra", label: t("nakshatra"), value: grahaNakshatraLine(g, lang) },
            { key: "motion", label: t("ui.gochar.motion"), value: motionLabel(g, lang) },
            { key: "speed", label: t("ui.gochar.speed"), value: speedTone(g, lang) },
          ],
          windows: [
            windowLine(en ? (g.rashi ?? "") : (g.rashi_ne ?? g.rashi ?? ""), g.next_rashi_entry?.entry_time_local),
            windowLine(
              en ? (g.next_nakshatra_entry?.to_nakshatra ?? "") : (g.next_nakshatra_entry?.to_nakshatra_ne ?? ""),
              g.next_nakshatra_entry?.entry_time_local,
            ),
            g.next_pada_entry?.to_pada
              ? windowLine(t("gochar.pada_n", { n: g.next_pada_entry.to_pada }), g.next_pada_entry.entry_time_local)
              : undefined,
          ].filter((w): w is string => Boolean(w)),
        }
      : null,
    copy: {
      eyebrow: t("ui.gochar.deep_dive"),
      title: t("ui.gochar.pick_a_planet"),
      subtitle: t("ui.gochar.current_position_windows_retrograde"),
      exalted: t("ui.gochar.exalted"),
      windowsTitle: t("ui.gochar.current_windows"),
    },
  };
}
