/**
 * The bhava bala "explore houses" chart's data, shared by the website's and
 * the app's `components/kundali/BhavaBalaChart.tsx`: each house's cell in the
 * North-Indian diamond (polygon, label positions, score, strength band) and
 * the selected house's inspector (rashi, classical name, lord, house classes,
 * rank, strength badge, score meter, component tiles, what it signifies from
 * the cached bhava reference, occupants). Each app keeps its own SVG drawing.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { bhavaReferenceKeys, fetchBhavaReference, type BhavaBalaData, type VargaCharts } from "@vedic-patro/api-client";
import { buildBhavaChart, houseClasses, type BhavaHouse, type HouseClass } from "@vedic-patro/domain/jyotish/bhava";
import { houseNumberPos, rashiFromMadhya, strengthBand, type StrengthBand } from "@vedic-patro/drawing/jyotish/kundali/bhava-bala-chart";
import { splitList } from "@vedic-patro/domain/jyotish/kundali/bhava-detail";
import { NI_HOUSE_POLYGONS, pointsToSvg, polygonCentroid } from "@vedic-patro/domain/jyotish/kundali/north-indian-layout";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatRashiByNumber } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

const HOUSE_CLASS_LABEL: Record<HouseClass, string> = {
  kendra: "kundali.kendra",
  trikona: "kundali.trikona",
  dusthana: "kundali.dusthana",
  upachaya: "kundali.upachaya",
};

/** Bar colour role per component tile; each app maps it to its own colour. */
export type BhavaBalaTone = "primary" | "secondary" | "accent";

function buildD1Houses(vargaCharts?: VargaCharts, combustion?: Record<string, boolean | null>): BhavaHouse[] {
  if (!vargaCharts) return [];
  const entries = vargaCharts.entries["1"] ?? [];
  const lagna = entries.find((entry) => entry.key === "lagna");
  if (!lagna) return [];
  return buildBhavaChart(
    lagna.vargaRashi,
    entries
      .filter((entry) => entry.key !== "lagna")
      .map((entry) => ({
        key: entry.key,
        labelNe: GRAHA_NAME[entry.key as GrahaKey]?.ne ?? entry.key,
        rashi: entry.vargaRashi,
        isRetrograde: entry.retrograde ?? false,
        isCombust: combustion?.[entry.key] ?? false,
      })),
  );
}

export function useBhavaBalaChart({
  data,
  selectedHouse,
  onSelectHouse,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const { t, lang, digits } = useLocale();
  const chartHouses = useMemo(() => buildD1Houses(vargaCharts, combustion), [vargaCharts, combustion]);
  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });
  const reference = referenceQ.data;

  const byHouse = useMemo(() => new Map(data.houses.map((house) => [house.house, house])), [data.houses]);
  const rankByHouse = useMemo(() => {
    const ranked = [...data.houses].sort((a, b) => b.totalPinda - a.totalPinda);
    return new Map(ranked.map((house, index) => [house.house, index + 1]));
  }, [data.houses]);

  const selected = byHouse.get(selectedHouse) ?? data.strongest;
  const selectedChartHouse = chartHouses.find((house) => house.house === selected.house);
  const band = strengthBand(selected.percent);
  const isStrongest = selected.house === data.strongest.house;
  const rashi = selectedChartHouse?.rashi ?? rashiFromMadhya(selected.madhyaLongitude);
  const occupants = selectedChartHouse?.planets ?? [];
  const maxBhavadhipati = Math.max(...data.houses.map((house) => house.bhavadhipati), 1);
  const maxDrishti = Math.max(...data.houses.map((house) => Math.abs(house.drishti)), 30);
  const goHouse = (delta: number) => onSelectHouse(((((selected.house - 1 + delta) % 12) + 12) % 12) + 1);
  const signed = (value: number) => digits(value < 0 ? `−${Math.abs(value).toFixed(1)}` : Math.abs(value).toFixed(1));

  const lordKey = selected.lordKey as GrahaKey;
  const titles =
    reference?.houseDetail[selected.house] != null
      ? bilingualText(lang, reference.houseDetail[selected.house]!.titlesNe, reference.houseDetail[selected.house]!.titlesEn)
      : reference?.houseInfo[selected.house] != null
        ? bilingualText(lang, reference.houseInfo[selected.house]!.themeNe, reference.houseInfo[selected.house]!.themeEn)
        : "";
  const classical = reference?.houseClassicalName[selected.house];
  const classes = houseClasses(selected.house);
  const strongLabel = t("kundali.report.confidence_strong");
  const averageLabel = t("kundali.average_strength");
  const weakLabel = t("kundali.x.status_weak");

  const tile = (key: string, label: string, value: number, max: number, tone: BhavaBalaTone) => ({ key, label, value, max, tone, display: signed(value) });

  return {
    title: t("kundali.explore_houses"),
    hint: t("kundali.explore_houses_hint"),
    chartLabel: t("kundali.bhava_bala_chart"),
    /** One diamond cell per house with its polygon and label positions (300×300 viewBox). */
    cells: Object.entries(NI_HOUSE_POLYGONS).flatMap(([houseStr, points]) => {
      const houseNum = Number(houseStr);
      const house = byHouse.get(houseNum);
      if (!house) return [];
      const [cx, cy] = polygonCentroid(points);
      const [nx, ny] = houseNumberPos(points);
      return [
        {
          house: houseNum,
          points: pointsToSvg(points),
          center: { x: cx, y: cy },
          numberPos: { x: nx, y: ny },
          number: digits(houseNum),
          score: digits(Math.round(house.totalPinda)),
          band: strengthBand(house.percent),
          selected: houseNum === selected.house,
          label: bilingualText(
            lang,
            t("ui.kundali.x_dc5617a3", { v0: digits(houseNum), v1: digits(Math.round(house.totalPinda)) }),
            `House ${houseNum}, ${Math.round(house.totalPinda)} virupas`,
          ),
          select: () => onSelectHouse(houseNum),
        },
      ];
    }),
    inspector: {
      house: selected.house,
      number: digits(selected.house),
      rashiName: formatRashiByNumber(rashi, lang),
      classical: classical ? bilingualText(lang, classical.ne, classical.en) : null,
      prevLabel: t("kundali.previous_house"),
      nextLabel: t("kundali.next_house"),
      prev: () => goHouse(-1),
      next: () => goHouse(1),
      ruledBy: t("kundali.ruled_by"),
      lordKey,
      lordName: bilingualText(lang, GRAHA_NAME[lordKey]?.ne, GRAHA_NAME[lordKey]?.en, selected.lordName),
      classes: classes.length > 0 ? classes.map((cls) => t(HOUSE_CLASS_LABEL[cls])).join(" · ") : null,
      rank: t("kundali.house_rank", { rank: digits(rankByHouse.get(selected.house) ?? 1), total: digits(data.houses.length) }),
      band,
      badge: {
        tone: isStrongest || band === "strong" ? ("good" as const) : band === "weak" ? ("weak" as const) : ("avg" as const),
        label: isStrongest ? t("kundali.very_strong") : band === "strong" ? strongLabel : band === "weak" ? weakLabel : averageLabel,
      },
      scoreTitle: t("kundali.nav_bhava_bala"),
      score: t("kundali.virupas_rupas", { virupas: digits(selected.totalPinda.toFixed(1)), rupas: digits(selected.rupas.toFixed(2)) }),
      totalPinda: selected.totalPinda,
      totalScale: Math.max(data.strongest.totalPinda, data.referenceVirupas),
      tiles: [
        tile("bhavadhipati", t("kundali.bhavadhipati"), selected.bhavadhipati, maxBhavadhipati, "primary"),
        tile("disha", t("kundali.bhava_disha"), selected.disha, 60, "secondary"),
        tile("drishti", t("kundali.bhava_drishti"), selected.drishti, maxDrishti, "accent"),
      ],
      signifiesLabel: t("kundali.signifies"),
      signifies: splitList(titles),
      occupantsLabel: t("kundali.occupants"),
      occupants: occupants.map((planet) => ({
        key: planet.key,
        name: bilingualText(lang, GRAHA_NAME[planet.key as GrahaKey]?.ne, GRAHA_NAME[planet.key as GrahaKey]?.en, planet.labelNe),
      })),
      noOccupants: t("kundali.no_occupants"),
    },
    legend: [
      { band: "strong" as StrengthBand, label: strongLabel },
      { band: "average" as StrengthBand, label: averageLabel },
      { band: "weak" as StrengthBand, label: weakLabel },
    ],
    legendNote: t("kundali.explore_houses_legend"),
  };
}
