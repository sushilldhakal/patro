/**
 * The North Indian D1 chart's data, shared by the website's
 * `components/kundali/D1Chart.tsx` and the app's
 * `components/panchanga/D1Chart.tsx` (data only): each house's polygon,
 * centre, rashi label and highlight flags, each graha glyph's position, abbr
 * and vakri / asta flags, the selected graha's drishti arrows and panel copy,
 * the open bhava detail house, and the bhava reference query. Each app keeps
 * drawing the chart (SVG / react-native-svg) and its own tap handling.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bhavaReferenceKeys, fetchBhavaReference, type BhavaReferencePayload } from "@vedic-patro/api-client";
import { aspectHousesFor, drishtiTargetHouses, type BhavaHouse } from "@vedic-patro/domain/bhava";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import {
  NI_HOUSE_POLYGONS,
  planetGridLayout,
  pointsToSvg,
  polygonCentroid,
  type Point,
} from "@vedic-patro/domain/kundali/north-indian-layout";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

/** Catalogue key for each planet's two-letter glyph label. */
const PLANET_ABBR_KEY: Record<string, string> = {
  sun: "kundali.x.abbr_sun",
  moon: "kundali.x.abbr_moon",
  mars: "kundali.x.abbr_mars",
  mercury: "kundali.x.abbr_mercury",
  jupiter: "kundali.x.abbr_jupiter",
  venus: "kundali.x.abbr_venus",
  saturn: "kundali.x.abbr_saturn",
  rahu: "kundali.x.abbr_rahu",
  ketu: "kundali.x.abbr_ketu",
};

export type D1Selected = { key: string; house: number };

export type D1ChartPlanet = {
  key: string;
  /** Two-letter glyph text. */
  abbr: string;
  /** Glyph baseline anchor (text-anchor middle), in viewBox units. */
  x: number;
  y: number;
  fontSize: number;
  /** Centre of the selection halo / touch target around the glyph. */
  haloY: number;
  /** vakri / asta marks: top-left corner and size. */
  markX: number;
  markY: number;
  markSize: number;
  isRetrograde: boolean | undefined;
  isCombust: boolean | undefined;
  isSelected: boolean;
  /** The bhava reference has a drishti entry for this graha. */
  isClickable: boolean;
};

export type D1ChartHouse = {
  house: number;
  points: Point[];
  svgPoints: string;
  cx: number;
  cy: number;
  /** The chart has data for this house (it opens the bhava detail). */
  hasData: boolean;
  isLagna: boolean;
  /** Aspected by the selected graha (and not the lagna). */
  isAspected: boolean;
  /** "1 Aries" — null for a house without data. */
  label: string | null;
  labelY: number;
  ariaLabel: string | null;
  planets: D1ChartPlanet[];
};

export type D1ChartArrow = { key: number; x1: number; y1: number; x2: number; y2: number };

export type D1DrishtiPanel = {
  title: string;
  effectLabel: string;
  badge: string;
  isMalefic: boolean;
  summary: string;
  closeLabel: string;
};

export function useD1Chart(houses: BhavaHouse[]) {
  const { t, lang, digits } = useLocale();
  const [selected, setSelected] = useState<D1Selected | null>(null);
  const [openHouse, setOpenHouse] = useState<number | null>(null);

  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });
  const reference: BhavaReferencePayload | undefined = referenceQ.data;

  const byHouse = useMemo(() => new Map(houses.map((h) => [h.house, h])), [houses]);
  const targetHouses = useMemo(
    () => (selected ? new Set(drishtiTargetHouses(selected.key, selected.house)) : null),
    [selected],
  );

  const cells: D1ChartHouse[] = Object.entries(NI_HOUSE_POLYGONS).map(([houseStr, points]) => {
    const houseNum = Number(houseStr);
    const house = byHouse.get(houseNum);
    const [cx, cy] = polygonCentroid(points);
    const planetLines = house?.planets ?? [];
    const layout = planetGridLayout(points, planetLines.length);
    const planets = planetLines.map((planet, i): D1ChartPlanet => {
      const row = Math.floor(i / layout.columns);
      const rowStart = row * layout.columns;
      const itemsInRow = Math.min(layout.columns, planetLines.length - rowStart);
      const col = i - rowStart;
      const x = cx + (col - (itemsInRow - 1) / 2) * layout.colGap;
      const y = cy + row * layout.rowGap;
      const markSize = layout.fontSize * 0.5;
      const abbrKey = PLANET_ABBR_KEY[planet.key];
      return {
        key: planet.key,
        abbr: abbrKey ? t(abbrKey) : planet.labelNe.slice(0, 2),
        x,
        y,
        fontSize: layout.fontSize,
        haloY: y - layout.fontSize * 0.3,
        // Marks sit just right of the abbreviation, aligned with the glyph's
        // mid-height — never lifted into the rashi label above.
        markX: x + layout.fontSize * 0.42,
        markY: y - markSize - layout.fontSize * 0.05,
        markSize,
        isRetrograde: planet.isRetrograde,
        isCombust: planet.isCombust,
        isSelected: selected?.key === planet.key && selected.house === houseNum,
        isClickable: Boolean(reference?.grahaDrishti[planet.key]),
      };
    });
    const isLagna = Boolean(house?.isLagna);
    return {
      house: houseNum,
      points,
      svgPoints: pointsToSvg(points),
      cx,
      cy,
      hasData: Boolean(house),
      isLagna,
      isAspected: Boolean(targetHouses?.has(houseNum)) && !isLagna,
      label: house ? `${digits(house.rashi)} ${formatRashiByNumber(house.rashi, lang)}` : null,
      labelY: cy - (planets.length > 0 ? 12 : 0),
      ariaLabel: house ? t("ui.kundali.house_housenum", { houseNum: digits(houseNum) }) : null,
      planets,
    };
  });

  const arrows: D1ChartArrow[] = [];
  if (selected && targetHouses) {
    for (const targetHouse of targetHouses) {
      if (targetHouse === selected.house) continue;
      const fromPoints = NI_HOUSE_POLYGONS[selected.house];
      const toPoints = NI_HOUSE_POLYGONS[targetHouse];
      if (!fromPoints || !toPoints) continue;
      const [x1, y1] = polygonCentroid(fromPoints);
      const [x2, y2] = polygonCentroid(toPoints);
      arrows.push({ key: targetHouse, x1, y1, x2, y2 });
    }
  }

  let drishti: D1DrishtiPanel | null = null;
  const info = selected ? reference?.grahaDrishti[selected.key] : undefined;
  if (selected && info) {
    const grahaKey = selected.key as GrahaKey;
    // The panel names the aspect by its classical offset (Jupiter always casts
    // its 5th/7th/9th) — the arrows point at the resolved absolute houses.
    const parts = aspectHousesFor(selected.key).map((h) => digits(h));
    const houseList =
      parts.length <= 1
        ? parts.join("")
        : t("ui.common.rest_and_last", { rest: parts.slice(0, -1).join(", "), last: parts[parts.length - 1] });
    const name = bilingualText(lang, GRAHA_NAME[grahaKey]?.ne, GRAHA_NAME[grahaKey]?.en, grahaKey);
    const nature = info.isMalefic ? t("ui.kundali.x_49c16645") : t("kundali.drishti_benefic");
    drishti = {
      title: t("ui.panchanga.name_s_aspect_houses_houselist", { name, houseList }),
      effectLabel: t("ui.panchanga.aspect_effect"),
      badge: info.isChaya ? t("ui.kundali.x_dd187864", { v0: nature }) : t("ui.kundali.x_7e22a3b0", { v0: nature }),
      isMalefic: info.isMalefic,
      summary: bilingualText(lang, info.summaryNe, info.summaryEn),
      closeLabel: t("ui.common.close"),
    };
  }

  const togglePlanet = (key: string, house: number) => {
    setSelected((prev) => (prev && prev.key === key && prev.house === house ? null : { key, house }));
  };

  return {
    ariaLabel: t("kundali.north_indian_kundali_chart"),
    reference,
    cells,
    arrows,
    selected,
    togglePlanet,
    clearSelected: () => setSelected(null),
    drishti,
    openHouse,
    setOpenHouse,
    closeHouse: () => setOpenHouse(null),
  };
}
