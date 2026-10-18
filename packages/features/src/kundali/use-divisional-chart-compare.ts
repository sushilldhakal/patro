/**
 * The side-by-side divisional chart comparison, shared by the website's and
 * the app's `components/kundali/DivisionalChartCompare.tsx`: the anchor and
 * varga pickers for each side (falling back to an available anchor), the
 * houses each side's chart draws, its title and caption, and the
 * graha / bhava table toggle. Each app draws its own chart and tables.
 */
import { useMemo, useState } from "react";
import type { VargaCharts } from "@vedic-patro/api-client";
import { buildBhavaChart, type BhavaHouse } from "@vedic-patro/domain/jyotish/bhava";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { CHART_ANCHOR_LABELS, GRAHA_ANCHOR_ORDER, VARGA_OPTIONS, vargaOption, type ChartAnchor } from "@vedic-patro/domain/jyotish/varga-display";
import { useLocale } from "@vedic-patro/i18n/react";

export type DivisionalPanelConfig = { anchor: ChartAnchor; division: number };

function buildDivisionalHouses(
  { anchor, division }: DivisionalPanelConfig,
  vargaCharts: VargaCharts,
  combustion: Record<string, boolean | null>,
): BhavaHouse[] {
  const entries = vargaCharts.entries[String(division)] ?? [];
  const anchorEntry = entries.find((e) => e.key === anchor);
  if (!anchorEntry) return [];

  const planetRashis = entries
    .filter((e) => e.key !== "lagna")
    .map((e) => ({
      key: e.key,
      labelNe: GRAHA_NAME[e.key as GrahaKey]?.ne ?? e.key,
      rashi: e.vargaRashi,
      // Retrograde/combust are physical states of the graha at the birth
      // instant, so they carry across every divisional chart.
      isRetrograde: e.retrograde ?? false,
      isCombust: combustion[e.key] ?? false,
    }));

  return buildBhavaChart(anchorEntry.vargaRashi, planetRashis);
}

const NO_COMBUSTION: Record<string, boolean | null> = {};

export function useDivisionalChartCompare({
  vargaCharts,
  combustion = NO_COMBUSTION,
  defaultLeft = { anchor: "lagna", division: 1 },
  defaultRight = { anchor: "moon", division: 9 },
}: {
  vargaCharts: VargaCharts;
  /** Per-graha combustion flags from the kundali detail response. */
  combustion?: Record<string, boolean | null>;
  defaultLeft?: DivisionalPanelConfig;
  defaultRight?: DivisionalPanelConfig;
}) {
  const { t, lang } = useLocale();
  const anchorOptions = useMemo(() => {
    const options: ChartAnchor[] = [];
    if (vargaCharts.points.lagna) options.push("lagna");
    for (const key of GRAHA_ANCHOR_ORDER) {
      if (vargaCharts.points[key]) options.push(key);
    }
    return options;
  }, [vargaCharts]);
  const [left, setLeft] = useState<DivisionalPanelConfig>(defaultLeft);
  const [right, setRight] = useState<DivisionalPanelConfig>(defaultRight);

  const safeLeft = useMemo(
    () => (anchorOptions.includes(left.anchor) ? left : { ...left, anchor: anchorOptions[0] ?? "lagna" }),
    [anchorOptions, left],
  );
  const safeRight = useMemo(
    () => (anchorOptions.includes(right.anchor) ? right : { ...right, anchor: anchorOptions[1] ?? anchorOptions[0] ?? "moon" }),
    [anchorOptions, right],
  );
  const leftHouses = useMemo(() => buildDivisionalHouses(safeLeft, vargaCharts, combustion), [safeLeft, vargaCharts, combustion]);
  const rightHouses = useMemo(() => buildDivisionalHouses(safeRight, vargaCharts, combustion), [safeRight, vargaCharts, combustion]);

  const anchorName = (anchor: ChartAnchor) => bilingualText(lang, CHART_ANCHOR_LABELS[anchor].labelNe, CHART_ANCHOR_LABELS[anchor].labelEn);
  const anchorSelect = anchorOptions.map((anchor) => ({ value: anchor, label: anchorName(anchor) }));
  const divisionSelect = VARGA_OPTIONS.map((opt) => ({ value: opt.division, label: `${opt.short} — ${bilingualText(lang, opt.labelNe, opt.labelEn)}` }));

  const slot = (side: "left" | "right", panel: DivisionalPanelConfig, houses: BhavaHouse[], setPanel: (next: DivisionalPanelConfig) => void) => {
    const varga = vargaOption(panel.division);
    return {
      side,
      panel,
      houses,
      setAnchor: (anchor: ChartAnchor) => setPanel({ ...panel, anchor }),
      setDivision: (division: number) => setPanel({ ...panel, division }),
      anchorName: anchorName(panel.anchor),
      vargaShort: varga.short,
      vargaName: bilingualText(lang, varga.labelNe, varga.labelEn),
      /** "Anchor · D9 — Navamsha" */
      chartTitle: `${anchorName(panel.anchor)} · ${varga.short} — ${bilingualText(lang, varga.labelNe, varga.labelEn)}`,
      /** "Anchor · D9" */
      caption: `${anchorName(panel.anchor)} · ${varga.short}`,
      showStatusLegend: houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust)),
      showTables: Boolean(vargaCharts.points[panel.anchor]) && houses.length > 0,
    };
  };

  return {
    /** False when no anchor point exists; the compare draws nothing then. */
    hasAnchors: anchorOptions.length > 0,
    sectionTitle: t("ui.kundali.divisional_charts_2"),
    sectionSubtitle: t("ui.kundali.compare_two_charts_d1_d9_etc"),
    anchorLabel: t("kundali.anchor"),
    divisionLabel: t("kundali.chart"),
    empty: t("kundali.not_enough_data_for_this_chart"),
    anchorSelect,
    divisionSelect,
    slots: [slot("left", safeLeft, leftHouses, setLeft), slot("right", safeRight, rightHouses, setRight)],
  };
}

export type DivisionalChartSlot = ReturnType<typeof useDivisionalChartCompare>["slots"][number];

/** The graha / bhava table toggle under one side's chart. */
export function useDivisionalTableToggle() {
  const { t } = useLocale();
  const [tab, setTab] = useState<"graha" | "bhava">("graha");
  return {
    tab,
    tabs: [
      { id: "graha" as const, label: t("kundali.graha"), active: tab === "graha", select: () => setTab("graha") },
      { id: "bhava" as const, label: t("kundali.bhava_19"), active: tab === "bhava", select: () => setTab("bhava") },
    ],
  };
}
