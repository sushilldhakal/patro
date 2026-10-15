import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { GrahaDetailsList } from "@/components/kundali/GrahaDetailsList";
import { BhavaTable } from "@/components/kundali/BhavaTable";
import type { VargaCharts } from "@/lib/api";
import type { ChartAnchor } from "@vedic-patro/domain/varga-display";
import {
  useDivisionalChartCompare,
  useDivisionalTableToggle,
  type DivisionalChartSlot,
  type DivisionalPanelConfig,
} from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Compare = ReturnType<typeof useDivisionalChartCompare>;

function ChartSlot({
  compare,
  slot,
  vargaCharts,
}: {
  compare: Compare;
  slot: DivisionalChartSlot;
  vargaCharts: VargaCharts;
}) {
  const toggle = useDivisionalTableToggle();
  const { panel, houses } = slot;

  return (
    <div className={cn(kundaliDetailClasses.compare.root, "flex")}>
      <div
        className={cn(
          kundaliDetailClasses.compare.controls,
          "flex",
          slot.side === "right" && "sm:justify-end",
        )}
      >
        <label className={cn(kundaliDetailClasses.compare.field, "flex min-w-[7.5rem]")}>
          <span className={kundaliDetailClasses.compare.fieldLabel}>{compare.anchorLabel}</span>
          <select
            className={kundaliDetailClasses.parts.selectControl}
            value={panel.anchor}
            onChange={(e) => slot.setAnchor(e.target.value as ChartAnchor)}
          >
            {compare.anchorSelect.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={cn(kundaliDetailClasses.compare.field, "flex min-w-[9rem]")}>
          <span className={kundaliDetailClasses.compare.fieldLabel}>{compare.divisionLabel}</span>
          <select
            className={kundaliDetailClasses.parts.selectControl}
            value={panel.division}
            onChange={(e) => slot.setDivision(Number(e.target.value))}
          >
            {compare.divisionSelect.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={cn(kundaliDetailClasses.compare.chartCard, "flex shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
        <div className={cn(kundaliDetailClasses.compare.chartTitleWrap, "text-center")}>
          <p className={kundaliDetailClasses.compare.chartTitle}>
            {slot.anchorName}
            <span className={kundaliDetailClasses.compare.chartSep}>·</span>
            {slot.vargaShort}
            <span className="mx-1 font-normal">—</span>
            {slot.vargaName}
          </p>
        </div>
        {houses.length > 0 ? (
          <>
            <D1Chart houses={houses} />
            {slot.showStatusLegend && <GrahaStatusLegend />}
          </>
        ) : (
          <p className={kundaliDetailClasses.compare.empty}>{compare.empty}</p>
        )}
      </div>

      {slot.showTables && (
        <div className={cn(kundaliDetailClasses.compare.tableCard, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
          <div className={cn(kundaliDetailClasses.compare.tableHead, "flex")}>
            <div className={cn(kundaliDetailClasses.compare.toggle, "inline-flex")}>
              {toggle.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.select}
                  className={cn(
                    kundaliDetailClasses.compare.toggleTab,
                    kundaliDetailClasses.compare.toggleText,
                    "rounded-[calc(var(--radius-lg)-2px)] transition-colors",
                    tab.active
                      ? cn(kundaliDetailClasses.compare.toggleActive, kundaliDetailClasses.compare.toggleActiveText, "shadow-sm")
                      : "hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className={kundaliDetailClasses.compare.caption}>
              {slot.anchorName}
              <span className="mx-1">·</span>
              {slot.vargaShort}
            </p>
          </div>
          {toggle.tab === "graha" ? (
            <GrahaDetailsList division={panel.division} anchorKey={panel.anchor} vargaCharts={vargaCharts} />
          ) : (
            <BhavaTable division={panel.division} anchorKey={panel.anchor} vargaCharts={vargaCharts} />
          )}
        </div>
      )}
    </div>
  );
}

export type DivisionalChartCompareProps = {
  vargaCharts: VargaCharts;
  /** Per-graha combustion flags from the kundali detail response. */
  combustion?: Record<string, boolean | null>;
  defaultLeft?: DivisionalPanelConfig;
  defaultRight?: DivisionalPanelConfig;
};

export function DivisionalChartCompare(props: DivisionalChartCompareProps) {
  const compare = useDivisionalChartCompare(props);

  if (!compare.hasAnchors) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4">
      {compare.slots.map((slot) => (
        <ChartSlot key={slot.side} compare={compare} slot={slot} vargaCharts={props.vargaCharts} />
      ))}
    </div>
  );
}
