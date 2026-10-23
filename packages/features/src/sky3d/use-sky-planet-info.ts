/**
 * The 3D sky's planet info card, shared by both apps'
 * `components/sky3d/AakashGocharSky.tsx`: the rows the top-left HUD shows for
 * whichever graha is selected — exact sidereal longitude, where it sits in its
 * rashi and nakshatra, and how it is moving. The same card in the space,
 * horizon and globe views, since it reads the scene's sample, not the view.
 */
import { useMemo } from "react";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import {
  nakshatraOfLongitude,
  normalizeDeg,
  padaOfLongitude,
  rashiOfLongitude,
} from "@vedic-patro/domain/astronomy/sky3d/geocentric-model";
import type { GeoBody } from "@vedic-patro/domain/astronomy/sky3d/orbital-model";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/panchanga/nakshatra-icons";
import { formatRashiByNumber } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { formatWheelDegree } from "@vedic-patro/domain/panchanga/wheel-degree-ring";
import { useLocale } from "@vedic-patro/i18n/react";

export type SkyPlanetInfoRow = { label: string; value: string };

export type SkyPlanetInfo = {
  name: string;
  /** "Retrograde" / "Direct" — null for the Sun, which never turns back. */
  motion: { label: string; retrograde: boolean } | null;
  rows: SkyPlanetInfoRow[];
};

/** 23.6833° → 23°41′. */
function degMin(deg: number): { d: number; m: number } {
  const total = Math.round(deg * 60);
  return { d: Math.floor(total / 60), m: total % 60 };
}

export function useSkyPlanetInfo(
  selectedKey: GrahaKey | null | undefined,
  body: GeoBody | undefined,
): SkyPlanetInfo | null {
  const { t, lang, digits } = useLocale();
  const longitude = body?.longitude;
  const latitude = body?.latitude;
  const speed = body?.speedDegPerDay;
  const distanceAu = body?.distanceAu;
  const retrograde = body?.retrograde;
  // The card's numbers move with the clock; round to what is printed so a
  // running sky re-renders on a visible change, not on every frame.
  const lonKey = longitude == null ? null : Math.round(longitude * 100);
  const latKey = latitude == null ? null : Math.round(latitude * 100);
  const speedKey = speed == null ? null : Math.round(speed * 1000);
  const distKey = distanceAu == null ? null : Math.round(distanceAu * 1000);

  return useMemo(() => {
    if (!selectedKey || lonKey == null) return null;
    const lon = normalizeDeg(lonKey / 100);
    const name = GRAHA_NAME[selectedKey];
    const rashi = rashiOfLongitude(lon);
    const inRashi = degMin(lon - (rashi - 1) * 30);
    const nak = NAKSHATRA_ICONS[nakshatraOfLongitude(lon) - 1];
    const num = (v: number, places: number) => digits(v.toFixed(places));
    const isNode = selectedKey === "rahu" || selectedKey === "ketu";

    const rows: SkyPlanetInfoRow[] = [
      { label: t("ui.sky3d.info_longitude"), value: digits(formatWheelDegree(lon)) },
      {
        label: t("panchanga.wheel.rashi"),
        value: `${digits(inRashi.d)}°${digits(String(inRashi.m).padStart(2, "0"))}′ ${formatRashiByNumber(rashi, lang)}`,
      },
    ];
    if (nak) {
      rows.push({
        label: t("nakshatra"),
        value: `${bilingualText(lang, nak.ne, nak.en)} · ${t("sections.pada_unit")} ${digits(padaOfLongitude(lon))}`,
      });
    }
    if (latKey != null && !isNode) {
      rows.push({ label: t("ui.sky3d.info_latitude"), value: `${digits(latKey < 0 ? "−" : "+")}${num(Math.abs(latKey / 100), 2)}°` });
    }
    if (speedKey != null) {
      rows.push({
        label: t("ui.sky3d.info_speed"),
        value: `${digits(speedKey < 0 ? "−" : "")}${num(Math.abs(speedKey / 1000), 3)}°/${t("common.day")}`,
      });
    }
    if (distKey != null && !isNode && selectedKey !== "sun") {
      rows.push({ label: t("ui.sky3d.info_distance"), value: `${num(distKey / 1000, 3)} AU` });
    }

    return {
      name: bilingualText(lang, name.ne, name.en),
      motion:
        selectedKey === "sun"
          ? null
          : retrograde
            ? { label: t("common.retrograde"), retrograde: true }
            : { label: t("ui.sky3d.info_direct"), retrograde: false },
      rows,
    };
  }, [selectedKey, lonKey, latKey, speedKey, distKey, retrograde, lang, t, digits]);
}
