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
import { GRAHA_NAME } from "@/lib/graha-details";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-3 min-w-0">
      <div
        className={cn(
          "flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/30 p-3",
          side === "right" && "sm:justify-end",
        )}
      >
        <label className="flex flex-col gap-1 min-w-[7.5rem] flex-1">
          <span className="text-sm font-semibold uppercase tracking-wider">
            {t("kundali.anchor")}
          </span>
          <select
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-base text-foreground"
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
        <label className="flex flex-col gap-1 min-w-[9rem] flex-1">
          <span className="text-sm font-semibold uppercase tracking-wider">
            {t("kundali.chart")}
          </span>
          <select
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-base text-foreground"
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

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]">
        <div className="text-center w-full border-b border-border/60 pb-2">
          <p className="text-sm font-bold text-foreground">
            {bilingualText(lang, anchorLabel.labelNe, anchorLabel.labelEn)}
            <span className="font-normal mx-1.5">·</span>
            {varga.short}
            <span className="font-normal mx-1">—</span>
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
          <p className="text-sm py-8">
            {t("kundali.not_enough_data_for_this_chart")}
          </p>
        )}
      </div>

      {hasAnchor && houses.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setTab("graha")}
                className={cn(
                  "px-3 py-1 rounded-[calc(var(--radius-lg)-2px)] text-sm font-semibold transition-colors",
                  tab === "graha"
                    ? "bg-card text-foreground shadow-sm"
                    : "hover:text-foreground",
                )}
              >
                {t("kundali.graha")}
              </button>
              <button
                type="button"
                onClick={() => setTab("bhava")}
                className={cn(
                  "px-3 py-1 rounded-[calc(var(--radius-lg)-2px)] text-sm font-semibold transition-colors",
                  tab === "bhava"
                    ? "bg-card text-foreground shadow-sm"
                    : "hover:text-foreground",
                )}
              >
                {t("kundali.bhava_19")}
              </button>
            </div>
            <p className="text-sm">
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
