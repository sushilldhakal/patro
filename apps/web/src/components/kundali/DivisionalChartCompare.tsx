import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { GrahaDetailsList } from "@/components/kundali/GrahaDetailsList";
import { BhavaTable } from "@/components/kundali/BhavaTable";
import type { VargaCharts } from "@/lib/api";
import { buildBhavaChart, type BhavaHouse } from "@vedic-patro/domain/bhava";
import {
  type ChartAnchor,
  CHART_ANCHOR_LABELS,
  GRAHA_ANCHOR_ORDER,
  VARGA_OPTIONS,
  vargaOption,
} from "@vedic-patro/domain/varga-display";
import { GRAHA_NAME } from "@vedic-patro/domain/graha-details";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type PanelConfig = {
  anchor: ChartAnchor;
  division: number;
};

function buildDivisionalHouses(
  { anchor, division }: PanelConfig,
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
      labelNe: GRAHA_NAME[e.key as keyof typeof GRAHA_NAME]?.ne ?? e.key,
      rashi: e.vargaRashi,
      // Retrograde/combust are physical states of the graha at the birth
      // instant, so they carry across every divisional chart.
      isRetrograde: e.retrograde ?? false,
      isCombust: combustion[e.key] ?? false,
    }));

  return buildBhavaChart(anchorEntry.vargaRashi, planetRashis);
}

function useAnchorOptions(vargaCharts: VargaCharts) {
  return useMemo(() => {
    const options: ChartAnchor[] = [];
    if (vargaCharts.points.lagna) options.push("lagna");
    for (const key of GRAHA_ANCHOR_ORDER) {
      if (vargaCharts.points[key]) options.push(key);
    }
    return options;
  }, [vargaCharts]);
}

function ChartSlot({
  panel,
  onPanelChange,
  houses,
  side,
  anchorOptions,
  vargaCharts,
}: {
  panel: PanelConfig;
  onPanelChange: (next: PanelConfig) => void;
  houses: BhavaHouse[];
  side: "left" | "right";
  anchorOptions: ChartAnchor[];
  vargaCharts: VargaCharts;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const varga = vargaOption(panel.division);
  const anchorLabel = CHART_ANCHOR_LABELS[panel.anchor];
  const hasAnchor = Boolean(vargaCharts.points[panel.anchor]);
  const [tab, setTab] = useState<"graha" | "bhava">("graha");

  return (
    <div className={cn(kundaliDetailClasses.compare.root, "flex")}>
      <div
        className={cn(
          kundaliDetailClasses.compare.controls,
          "flex",
          side === "right" && "sm:justify-end",
        )}
      >
        <label className={cn(kundaliDetailClasses.compare.field, "flex min-w-[7.5rem]")}>
          <span className={kundaliDetailClasses.compare.fieldLabel}>
            {t("kundali.anchor")}
          </span>
          <select
            className={kundaliDetailClasses.parts.selectControl}
            value={panel.anchor}
            onChange={(e) =>
              onPanelChange({ ...panel, anchor: e.target.value as ChartAnchor })
            }
          >
            {anchorOptions.map((anchor) => {
              const labels = CHART_ANCHOR_LABELS[anchor];
              return (
                <option key={anchor} value={anchor}>
                  {bilingualText(lang, labels.labelNe, labels.labelEn)}
                </option>
              );
            })}
          </select>
        </label>
        <label className={cn(kundaliDetailClasses.compare.field, "flex min-w-[9rem]")}>
          <span className={kundaliDetailClasses.compare.fieldLabel}>
            {t("kundali.chart")}
          </span>
          <select
            className={kundaliDetailClasses.parts.selectControl}
            value={panel.division}
            onChange={(e) =>
              onPanelChange({ ...panel, division: Number(e.target.value) })
            }
          >
            {VARGA_OPTIONS.map((opt) => (
              <option key={opt.division} value={opt.division}>
                {opt.short} — {bilingualText(lang, opt.labelNe, opt.labelEn)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={cn(kundaliDetailClasses.compare.chartCard, "flex shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
        <div className={cn(kundaliDetailClasses.compare.chartTitleWrap, "text-center")}>
          <p className={kundaliDetailClasses.compare.chartTitle}>
            {bilingualText(lang, anchorLabel.labelNe, anchorLabel.labelEn)}
            <span className={kundaliDetailClasses.compare.chartSep}>·</span>
            {varga.short}
            <span className="mx-1 font-normal">—</span>
            {bilingualText(lang, varga.labelNe, varga.labelEn)}
          </p>
        </div>
        {houses.length > 0 ? (
          <>
            <D1Chart houses={houses} />
            {houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust)) && (
              <GrahaStatusLegend />
            )}
          </>
        ) : (
          <p className={kundaliDetailClasses.compare.empty}>
            {t("kundali.not_enough_data_for_this_chart")}
          </p>
        )}
      </div>

      {hasAnchor && houses.length > 0 && (
        <div className={cn(kundaliDetailClasses.compare.tableCard, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
          <div className={cn(kundaliDetailClasses.compare.tableHead, "flex")}>
            <div className={cn(kundaliDetailClasses.compare.toggle, "inline-flex")}>
              <button
                type="button"
                onClick={() => setTab("graha")}
                className={cn(
                  kundaliDetailClasses.compare.toggleTab,
                  kundaliDetailClasses.compare.toggleText,
                  "rounded-[calc(var(--radius-lg)-2px)] transition-colors",
                  tab === "graha"
                    ? cn(kundaliDetailClasses.compare.toggleActive, kundaliDetailClasses.compare.toggleActiveText, "shadow-sm")
                    : "hover:text-foreground",
                )}
              >
                {t("kundali.graha")}
              </button>
              <button
                type="button"
                onClick={() => setTab("bhava")}
                className={cn(
                  kundaliDetailClasses.compare.toggleTab,
                  kundaliDetailClasses.compare.toggleText,
                  "rounded-[calc(var(--radius-lg)-2px)] transition-colors",
                  tab === "bhava"
                    ? cn(kundaliDetailClasses.compare.toggleActive, kundaliDetailClasses.compare.toggleActiveText, "shadow-sm")
                    : "hover:text-foreground",
                )}
              >
                {t("kundali.bhava_19")}
              </button>
            </div>
            <p className={kundaliDetailClasses.compare.caption}>
              {bilingualText(lang, anchorLabel.labelNe, anchorLabel.labelEn)}
              <span className="mx-1">·</span>
              {varga.short}
            </p>
          </div>
          {tab === "graha" ? (
            <GrahaDetailsList
              division={panel.division}
              anchorKey={panel.anchor}
              vargaCharts={vargaCharts}
            />
          ) : (
            <BhavaTable
              division={panel.division}
              anchorKey={panel.anchor}
              vargaCharts={vargaCharts}
            />
          )}
        </div>
      )}
    </div>
  );
}

export type DivisionalChartCompareProps = {
  vargaCharts: VargaCharts;
  /** Per-graha combustion (अस्त) flags from the kundali detail response. */
  combustion?: Record<string, boolean | null>;
  defaultLeft?: PanelConfig;
  defaultRight?: PanelConfig;
};

export function DivisionalChartCompare({
  vargaCharts,
  combustion = {},
  defaultLeft = { anchor: "lagna", division: 1 },
  defaultRight = { anchor: "moon", division: 9 },
}: DivisionalChartCompareProps) {
  const anchorOptions = useAnchorOptions(vargaCharts);
  const [left, setLeft] = useState<PanelConfig>(defaultLeft);
  const [right, setRight] = useState<PanelConfig>(defaultRight);

  const safeLeft = useMemo(
    () => (anchorOptions.includes(left.anchor) ? left : { ...left, anchor: anchorOptions[0] ?? "lagna" }),
    [anchorOptions, left],
  );
  const safeRight = useMemo(
    () =>
      anchorOptions.includes(right.anchor)
        ? right
        : { ...right, anchor: anchorOptions[1] ?? anchorOptions[0] ?? "moon" },
    [anchorOptions, right],
  );

  const leftHouses = useMemo(
    () => buildDivisionalHouses(safeLeft, vargaCharts, combustion),
    [safeLeft, vargaCharts, combustion],
  );

  const rightHouses = useMemo(
    () => buildDivisionalHouses(safeRight, vargaCharts, combustion),
    [safeRight, vargaCharts, combustion],
  );

  if (anchorOptions.length === 0) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4">
      <ChartSlot
        panel={safeLeft}
        onPanelChange={setLeft}
        houses={leftHouses}
        side="left"
        anchorOptions={anchorOptions}
        vargaCharts={vargaCharts}
      />
      <ChartSlot
        panel={safeRight}
        onPanelChange={setRight}
        houses={rightHouses}
        side="right"
        anchorOptions={anchorOptions}
        vargaCharts={vargaCharts}
      />
    </div>
  );
}
