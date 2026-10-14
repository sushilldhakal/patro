/**
 * The shadbala "strength skyline" chart's data, shared by the website's and
 * the app's `components/kundali/ShadbalaChart.tsx`: the scale tabs, the y-axis
 * ticks, each planet's stacked column (segment shares, height, required line,
 * value label, meets / below), the legend, the planet picker and the selected
 * planet's inspector (bala breakdown and sthana / kala sub-balas with their
 * meter maxima). Each app keeps its own drawing (bars, meters, colours).
 */
import { useMemo } from "react";
import type { ShadbalaPlanet, YuddhaData } from "@vedic-patro/api-client";
import {
  displayRequired,
  displayTotal,
  formatScaleValue,
  segmentDisplay,
  yMaxFor,
  type ShadbalaScale,
} from "@vedic-patro/domain/kundali/shadbala-chart";
import { BALA_STACK, GRAHA_NAME_I18N, KALA_SUBS, STHANA_SUBS, grahaDisplayName, yuddhaVirupasForPlanet } from "@vedic-patro/domain/kundali/shadbala-display";
import { useLocale } from "@vedic-patro/i18n/react";

const SCALES: { id: ShadbalaScale; label: string }[] = [
  { id: "virupas", label: "kundali.virupas" },
  { id: "rupas", label: "kundali.rupas" },
  { id: "absolute", label: "kundali.scale_absolute" },
  { id: "required", label: "kundali.scale_vs_required" },
];

const TICK_PARTS = [0, 0.25, 0.5, 0.75, 1];

export type ShadbalaMeterRow = { key: string; label: string; value: number; display: string };

export function useShadbalaChart({
  planets,
  selectedKey,
  yuddha,
  scale,
}: {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  yuddha?: YuddhaData;
  scale: ShadbalaScale;
}) {
  const { t, lang, digits } = useLocale();
  const planetLabel = (planet: ShadbalaPlanet) =>
    GRAHA_NAME_I18N[planet.key] ? t(GRAHA_NAME_I18N[planet.key]!) : grahaDisplayName(planet.key, lang, planet);
  const yMax = useMemo(() => yMaxFor(planets, scale), [planets, scale]);
  const signed = (value: number) => digits(value < 0 ? `−${Math.abs(value).toFixed(1)}` : value.toFixed(1));
  const kalaValue = (planet: ShadbalaPlanet, key: (typeof KALA_SUBS)[number]["key"]) =>
    key === "yuddha" && yuddha ? yuddhaVirupasForPlanet(planet, yuddha) : (planet.sub_balas?.kala?.[key] ?? 0);

  const columns = planets.map((planet) => {
    const total = displayTotal(planet, scale);
    const required = displayRequired(planet, scale);
    const segments = BALA_STACK.map((bala) => ({
      key: bala.key,
      color: bala.color,
      value: segmentDisplay(planet.breakdown[bala.breakdownKey], planet, scale),
    })).filter((segment) => segment.value > 0);
    const segmentSum = segments.reduce((sum, segment) => sum + segment.value, 0);
    return {
      key: planet.key,
      name: planetLabel(planet),
      selected: planet.key === selectedKey,
      meets: planet.total_virupas >= planet.required,
      columnPct: Math.min(100, (total / yMax) * 100),
      requiredPct: required == null ? null : Math.min(100, (required / yMax) * 100),
      value:
        scale === "rupas"
          ? digits(planet.rupas.toFixed(1))
          : scale === "required"
            ? `${digits((planet.ratio * 100).toFixed(0))}%`
            : digits(planet.total_virupas.toFixed(1)),
      /** Stacked segments, bottom first; `pct` is each one's share of the column. */
      segments: segments.map((s) => ({ ...s, pct: segmentSum > 0 ? (s.value / segmentSum) * 100 : 0 })),
    };
  });

  const selected = planets.find((planet) => planet.key === selectedKey) ?? planets[0];
  const inspector = selected
    ? {
        key: selected.key,
        name: planetLabel(selected),
        meets: selected.total_virupas >= selected.required,
        value: t("kundali.of_required", {
          virupas: digits(selected.total_virupas.toFixed(1)),
          percent: digits((selected.ratio * 100).toFixed(1)),
        }),
        breakdownMax: Math.max(...BALA_STACK.map((bala) => Math.abs(selected.breakdown[bala.breakdownKey])), 1),
        breakdown: BALA_STACK.map((bala) => {
          const value = selected.breakdown[bala.breakdownKey];
          return { key: bala.key, label: t(bala.label), color: bala.color, value, display: signed(value) };
        }),
        /** Sthana then kala sub-balas; null when the API sent none. */
        subs: selected.sub_balas
          ? [
              {
                key: "sthana" as const,
                title: t("kundali.x.bala_sthana"),
                max: Math.max(...STHANA_SUBS.map((row) => Math.abs(selected.sub_balas?.sthana?.[row.key] ?? 0)), 1),
                rows: STHANA_SUBS.map((row): ShadbalaMeterRow => {
                  const value = selected.sub_balas?.sthana?.[row.key] ?? 0;
                  return { key: row.key, label: t(row.label), value, display: signed(value) };
                }),
              },
              {
                key: "kala" as const,
                title: t("kundali.x.bala_kala"),
                max: Math.max(...KALA_SUBS.map((row) => Math.abs(kalaValue(selected, row.key))), 1),
                rows: KALA_SUBS.map((row): ShadbalaMeterRow => {
                  const value = kalaValue(selected, row.key);
                  return { key: row.key, label: t(row.label), value, display: signed(value) };
                }),
              },
            ]
          : null,
      }
    : null;

  return {
    title: t("kundali.strength_skyline"),
    hint: t("kundali.strength_skyline_hint"),
    scales: SCALES.map((s) => ({ id: s.id, label: t(s.label), active: s.id === scale })),
    ticks: TICK_PARTS.map((part) => {
      const value = yMax * part;
      return { key: String(value), pct: (value / yMax) * 100, label: formatScaleValue(value, scale, digits) };
    }),
    columns,
    legend: BALA_STACK.map((bala) => ({ key: bala.key, color: bala.color, label: t(bala.label) })),
    requiredLabel: t("kundali.required_minimum"),
    meetsLabel: t("kundali.meets_required"),
    belowLabel: t("kundali.below_required"),
    pickLabel: t("kundali.select_a_planet"),
    inspector,
  };
}
