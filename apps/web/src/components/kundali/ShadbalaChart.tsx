import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { useLocale } from "@/i18n/locale";
import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import {
  BALA_STACK,
  GRAHA_NAME_I18N,
  KALA_SUBS,
  STHANA_SUBS,
  grahaDisplayName,
  yuddhaVirupasForPlanet,
} from "@vedic-patro/domain/kundali/shadbala-display";
import { cn } from "@vedic-patro/domain/utils";
import { type ShadbalaScale, yMaxFor, displayTotal, displayRequired, segmentDisplay, formatScaleValue } from "@vedic-patro/domain/kundali/shadbala-chart";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
export { type ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";

const SCALES: { id: ShadbalaScale; label: string }[] = [
  { id: "virupas", label: "kundali.virupas" },
  { id: "rupas", label: "kundali.rupas" },
  { id: "absolute", label: "kundali.scale_absolute" },
  { id: "required", label: "kundali.scale_vs_required" },
];

function yTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((part) => max * part);
}

function Meter({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <div className={kundaliDetailClasses.shadbalaChart.meter}>
      <div className={kundaliDetailClasses.shadbalaChart.meterFill} style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

export function ShadbalaChart({
  planets,
  selectedKey,
  onSelect,
  yuddha,
  scale,
  onScaleChange,
}: {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  onSelect: (key: string) => void;
  yuddha?: YuddhaData;
  scale: ShadbalaScale;
  onScaleChange: (scale: ShadbalaScale) => void;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const planetLabel = (planet: ShadbalaPlanet) =>
    GRAHA_NAME_I18N[planet.key] ? t(GRAHA_NAME_I18N[planet.key]) : grahaDisplayName(planet.key, lang, planet);
  const yMax = useMemo(() => yMaxFor(planets, scale), [planets, scale]);
  const ticks = useMemo(() => yTicks(yMax), [yMax]);
  const selected = planets.find((planet) => planet.key === selectedKey) ?? planets[0];
  const selectedMeets = selected != null && selected.total_virupas >= selected.required;

  return (
    <div className="space-y-4">
      <div className={cn(kundaliDetailClasses.shadbalaChart.headRow, "flex flex-col sm:flex-row sm:items-start sm:justify-between")}>
        <div>
          <h3 className={kundaliDetailClasses.shadbalaChart.title}>{t("kundali.strength_skyline")}</h3>
          <p className={kundaliDetailClasses.shadbalaChart.hint}>{t("kundali.strength_skyline_hint")}</p>
        </div>
        <div className={cn(kundaliDetailClasses.shadbalaChart.scaleBar, "flex")}>
          {SCALES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onScaleChange(item.id)}
              aria-pressed={scale === item.id}
              className={cn(
                kundaliDetailClasses.shadbalaChart.scaleTab,
                kundaliDetailClasses.shadbalaChart.scaleText,
                "transition-colors",
                scale === item.id
                  ? cn(kundaliDetailClasses.shadbalaChart.scaleActive, kundaliDetailClasses.shadbalaChart.scaleActiveText)
                  : cn(kundaliDetailClasses.shadbalaChart.scaleIdleText, "hover:text-foreground"),
              )}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>

      <div className={kundaliDetailClasses.shadbalaChart.panel}>
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <div className="relative mt-6 h-64">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={cn(kundaliDetailClasses.shadbalaChart.axisLabel, "absolute right-0 -translate-y-1/2")}
                style={{ bottom: `${(tick / yMax) * 100}%` }}
              >
                {formatScaleValue(tick, scale, digits)}
              </span>
            ))}
          </div>
          <div>
            <div className="relative mt-6 h-64">
              {ticks.map((tick) => (
                <div
                  key={`grid-${tick}`}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ bottom: `${(tick / yMax) * 100}%` }}
                />
              ))}
              <div className="relative z-[1] grid h-full grid-cols-7 gap-1.5 sm:gap-3">
                {planets.map((planet) => (
                  <PlanetColumn
                    key={planet.key}
                    planet={planet}
                    name={planetLabel(planet)}
                    scale={scale}
                    yMax={yMax}
                    selected={planet.key === selectedKey}
                    onSelect={() => onSelect(planet.key)}
                    digits={digits}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-3">
              {planets.map((planet) => (
                <button
                  key={planet.key}
                  type="button"
                  onClick={() => onSelect(planet.key)}
                  className="flex min-w-0 flex-col items-center gap-0.5 outline-none"
                >
                  <GrahaPlanetIcon graha={planet.key as GrahaKey} size={18} />
                  <span className={cn(kundaliDetailClasses.shadbalaChart.barLabel, "max-w-full truncate")}>
                    {planetLabel(planet)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(kundaliDetailClasses.shadbalaChart.legend, kundaliDetailClasses.shadbalaChart.legendText, "flex")}>
          {BALA_STACK.map((bala) => (
            <span key={bala.key} className={cn(kundaliDetailClasses.shadbalaChart.legendItem, "inline-flex")}>
              <span className={kundaliDetailClasses.shadbalaChart.legendDot} style={{ backgroundColor: bala.color }} aria-hidden />
              {t(bala.label)}
            </span>
          ))}
          <span className={cn(kundaliDetailClasses.shadbalaChart.legendItem, "inline-flex")}>
            <span className="w-4 border-t border-dashed border-accent" aria-hidden />
            {t("kundali.required_minimum")}
          </span>
        </div>
      </div>

      <div>
        <p className={kundaliDetailClasses.shadbalaChart.pickLabel}>
          {t("kundali.select_a_planet")}
        </p>
        <div className={cn(kundaliDetailClasses.shadbalaChart.pickRow, "flex")}>
          {planets.map((planet) => {
            const active = planet.key === selectedKey;
            return (
              <button
                key={planet.key}
                type="button"
                onClick={() => onSelect(planet.key)}
                aria-pressed={active}
                className={cn(
                  kundaliDetailClasses.shadbalaChart.pickChip,
                  kundaliDetailClasses.shadbalaChart.pickChipText,
                  "inline-flex transition-colors",
                  active
                    ? cn(kundaliDetailClasses.shadbalaChart.pickActive, kundaliDetailClasses.shadbalaChart.pickActiveText)
                    : cn(kundaliDetailClasses.shadbalaChart.pickIdle, kundaliDetailClasses.shadbalaChart.pickIdleText, "hover:text-foreground"),
                )}
              >
                <GrahaPlanetIcon graha={planet.key as GrahaKey} size={16} />
                {planetLabel(planet)}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <PlanetInspector
          planet={selected}
          name={planetLabel(selected)}
          meets={selectedMeets}
          yuddha={yuddha}
          digits={digits}
        />
      )}
    </div>
  );
}

function PlanetColumn({
  planet,
  name,
  scale,
  yMax,
  selected,
  onSelect,
  digits,
}: {
  planet: ShadbalaPlanet;
  name: string;
  scale: ShadbalaScale;
  yMax: number;
  selected: boolean;
  onSelect: () => void;
  digits: (v: string | number) => string;
}) {
  const { t } = useTranslation();
  const total = displayTotal(planet, scale);
  const required = displayRequired(planet, scale);
  const meets = planet.total_virupas >= planet.required;
  const columnPct = Math.min(100, (total / yMax) * 100);
  const requiredPct = required == null ? null : Math.min(100, (required / yMax) * 100);
  const labelValue =
    scale === "rupas"
      ? digits(planet.rupas.toFixed(1))
      : scale === "required"
        ? `${digits((planet.ratio * 100).toFixed(0))}%`
        : digits(planet.total_virupas.toFixed(1));

  const segments = BALA_STACK.map((bala) => ({
    ...bala,
    value: segmentDisplay(planet.breakdown[bala.breakdownKey], planet, scale),
  })).filter((segment) => segment.value > 0);
  const segmentSum = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${name}, ${labelValue}`}
      className="relative h-full min-w-0 outline-none"
    >
      <div className={cn("absolute inset-x-[12%] inset-y-0", selected && "rounded-sm ring-2 ring-primary")}>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col-reverse overflow-hidden rounded-sm"
          style={{ height: `${columnPct}%` }}
        >
          {segments.map((segment) => (
            <div
              key={segment.key}
              style={{
                height: `${segmentSum > 0 ? (segment.value / segmentSum) * 100 : 0}%`,
                backgroundColor: segment.color,
              }}
            />
          ))}
        </div>
        <div
          className="absolute inset-x-0 flex -translate-y-full items-end justify-center gap-0.5 pb-0.5 font-mono text-xs font-semibold tabular-nums text-foreground"
          style={{ bottom: `${columnPct}%` }}
        >
          <span className="max-w-full truncate">{labelValue}</span>
          {meets ? (
            <Check className="size-3 shrink-0 text-primary" aria-label={t("kundali.meets_required")} />
          ) : (
            <X className="size-3 shrink-0 text-destructive" aria-label={t("kundali.below_required")} />
          )}
        </div>
        {requiredPct != null && (
          <div
            className="absolute inset-x-[-18%] border-t border-dashed border-accent"
            style={{ bottom: `${requiredPct}%` }}
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}

function PlanetInspector({
  planet,
  name,
  meets,
  yuddha,
  digits,
}: {
  planet: ShadbalaPlanet;
  name: string;
  meets: boolean;
  yuddha?: YuddhaData;
  digits: (v: string | number) => string;
}) {
  const { t } = useTranslation();
  const maxBala = Math.max(...BALA_STACK.map((bala) => Math.abs(planet.breakdown[bala.breakdownKey])), 1);
  const sthanaMax = Math.max(
    ...STHANA_SUBS.map((row) => Math.abs(planet.sub_balas?.sthana?.[row.key] ?? 0)),
    1,
  );
  const kalaMax = Math.max(
    ...KALA_SUBS.map((row) => {
      const value =
        row.key === "yuddha" && yuddha
          ? yuddhaVirupasForPlanet(planet, yuddha)
          : (planet.sub_balas?.kala?.[row.key] ?? 0);
      return Math.abs(value);
    }),
    1,
  );

  return (
    <div className={cn(kundaliDetailClasses.shadbalaChart.inspector, "space-y-3")}>
      <div className={cn(kundaliDetailClasses.shadbalaChart.inspectorHead, "flex")}>
        <p className={cn(kundaliDetailClasses.shadbalaChart.inspectorTitleRow, kundaliDetailClasses.shadbalaChart.inspectorTitle, "inline-flex")}>
          <GrahaPlanetIcon graha={planet.key as GrahaKey} size={22} />
          {name}
        </p>
        <p className={cn(kundaliDetailClasses.shadbalaChart.inspectorValue, meets ? kundaliDetailClasses.shadbalaChart.inspectorMeets : kundaliDetailClasses.shadbalaChart.inspectorBelow)}>
          {t("kundali.of_required", {
            virupas: digits(planet.total_virupas.toFixed(1)),
            percent: digits((planet.ratio * 100).toFixed(1)),
          })}
        </p>
      </div>

      <div className="space-y-2">
        {BALA_STACK.map((bala) => {
          const value = planet.breakdown[bala.breakdownKey];
          const signed = value < 0 ? `−${Math.abs(value).toFixed(1)}` : value.toFixed(1);
          return (
            <div key={bala.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.25rem] items-center gap-2">
              <span className={cn(kundaliDetailClasses.shadbalaChart.breakdownLabel, "truncate")}>{t(bala.label)}</span>
              <Meter value={value} max={maxBala} color={bala.color} />
              <span className={kundaliDetailClasses.shadbalaChart.breakdownValue}>{digits(signed)}</span>
            </div>
          );
        })}
      </div>

      {planet.sub_balas && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SubBalaList
            title={t("kundali.x.bala_sthana")}
            rows={STHANA_SUBS.map((row) => ({
              key: row.key,
              label: t(row.label),
              value: planet.sub_balas?.sthana?.[row.key] ?? 0,
            }))}
            max={sthanaMax}
            color="var(--brand-saffron)"
            digits={digits}
          />
          <SubBalaList
            title={t("kundali.x.bala_kala")}
            rows={KALA_SUBS.map((row) => ({
              key: row.key,
              label: t(row.label),
              value:
                row.key === "yuddha" && yuddha
                  ? yuddhaVirupasForPlanet(planet, yuddha)
                  : (planet.sub_balas?.kala?.[row.key] ?? 0),
            }))}
            max={kalaMax}
            color="var(--brand-blue)"
            digits={digits}
          />
        </div>
      )}
    </div>
  );
}

function SubBalaList({
  title,
  rows,
  max,
  color,
  digits,
}: {
  title: string;
  rows: { key: string; label: string; value: number }[];
  max: number;
  color: string;
  digits: (v: string | number) => string;
}) {
  return (
    <div>
      <p className={kundaliDetailClasses.shadbalaChart.subTitle}>{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const signed = row.value < 0 ? `−${Math.abs(row.value).toFixed(1)}` : row.value.toFixed(1);
          return (
            <div key={row.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3.75rem] items-center gap-2">
              <span className={cn(kundaliDetailClasses.shadbalaChart.subLabel, "truncate")}>{row.label}</span>
              <Meter value={row.value} max={max} color={color} />
              <span className={kundaliDetailClasses.shadbalaChart.subValue}>
                {digits(signed)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
