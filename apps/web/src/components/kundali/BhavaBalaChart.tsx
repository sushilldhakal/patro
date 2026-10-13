import { useMemo } from "react";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { BhavaBalaData, BhavaBalaHouse, BhavaReferencePayload, VargaCharts } from "@/lib/api";
import { bhavaReferenceKeys, fetchBhavaReference } from "@/lib/api";
import {
  buildBhavaChart,
  houseClasses,
  type BhavaHouse,
  type HouseClass,
} from "@vedic-patro/domain/bhava";
import { splitList } from "@vedic-patro/domain/kundali/bhava-detail";
import {
  NI_HOUSE_POLYGONS,
  pointsToSvg,
  polygonCentroid,
} from "@vedic-patro/domain/kundali/north-indian-layout";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@vedic-patro/domain/utils";
import { type StrengthBand, strengthBand, houseNumberPos, rashiFromMadhya, clampPct } from "@vedic-patro/domain/kundali/bhava-bala-chart";
const HOUSE_CLASS_LABEL: Record<HouseClass, string> = {
  kendra: "kundali.kendra",
  trikona: "kundali.trikona",
  dusthana: "kundali.dusthana",
  upachaya: "kundali.upachaya",
};

function scoreFillClass(band: StrengthBand): string {
  if (band === "strong") return "fill-primary";
  if (band === "weak") return "fill-destructive";
  return "fill-muted-foreground";
}

function scoreTextClass(band: StrengthBand): string {
  if (band === "strong") return kundaliDetailClasses.bhavaChart.scoreStrong;
  if (band === "weak") return kundaliDetailClasses.bhavaChart.scoreWeak;
  return kundaliDetailClasses.bhavaChart.scoreAvg;
}

function buildD1Houses(
  vargaCharts?: VargaCharts,
  combustion?: Record<string, boolean | null>,
): BhavaHouse[] {
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

function Meter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width = clampPct(Math.abs(value), max);
  return (
    <div className={kundaliDetailClasses.bhavaChart.meter}>
      <div className={cn(kundaliDetailClasses.bhavaChart.meterFill, className)} style={{ width: `${width}%` }} />
    </div>
  );
}

function ComponentTile({
  label,
  value,
  max,
  barClass,
  digits,
}: {
  label: string;
  value: number;
  max: number;
  barClass: string;
  digits: (v: string | number) => string;
}) {
  const abs = Math.abs(value).toFixed(1);
  const signed = value < 0 ? `−${abs}` : abs;
  return (
    <div className={kundaliDetailClasses.bhavaChart.tile}>
      <p className={kundaliDetailClasses.bhavaChart.tileLabel}>{label}</p>
      <p className={kundaliDetailClasses.bhavaChart.tileValue}>
        {digits(signed)}
      </p>
      <div className={kundaliDetailClasses.bhavaChart.tileMeter}>
        <Meter value={value} max={max} className={barClass} />
      </div>
    </div>
  );
}

function StrengthBadge({
  band,
  isStrongest,
}: {
  band: StrengthBand;
  isStrongest: boolean;
}) {
  const { t } = useTranslation();
  const label = isStrongest
    ? t("kundali.very_strong")
    : band === "strong"
      ? t("kundali.report.confidence_strong")
      : band === "weak"
        ? t("kundali.x.status_weak")
        : t("kundali.average_strength");
  return (
    <span
      className={cn(
        kundaliDetailClasses.bhavaChart.badge,
        kundaliDetailClasses.bhavaChart.badgeText,
        "inline-flex",
        isStrongest || band === "strong"
          ? cn(kundaliDetailClasses.bhavaChart.badgeGood, kundaliDetailClasses.bhavaChart.badgeGoodText)
          : band === "weak"
            ? cn(kundaliDetailClasses.bhavaChart.badgeWeak, kundaliDetailClasses.bhavaChart.badgeWeakText)
            : cn(kundaliDetailClasses.bhavaChart.badgeAvg, kundaliDetailClasses.bhavaChart.badgeAvgText),
      )}
    >
      {label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn(kundaliDetailClasses.bhavaChart.chip, kundaliDetailClasses.bhavaChart.chipText, "inline-flex")}>
      {children}
    </span>
  );
}

export function BhavaBalaChart({
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
  const { t } = useTranslation();
  const chartHouses = useMemo(
    () => buildD1Houses(vargaCharts, combustion),
    [vargaCharts, combustion],
  );
  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });

  const byHouse = useMemo(
    () => new Map(data.houses.map((house) => [house.house, house])),
    [data.houses],
  );
  const rankByHouse = useMemo(() => {
    const ranked = [...data.houses].sort((a, b) => b.totalPinda - a.totalPinda);
    return new Map(ranked.map((house, index) => [house.house, index + 1]));
  }, [data.houses]);

  const selected = byHouse.get(selectedHouse) ?? data.strongest;
  const selectedChartHouse = chartHouses.find((house) => house.house === selected.house);
  const band = strengthBand(selected.percent);
  const rashi = selectedChartHouse?.rashi ?? rashiFromMadhya(selected.madhyaLongitude);
  const occupants = selectedChartHouse?.planets ?? [];
  const maxBhavadhipati = Math.max(...data.houses.map((house) => house.bhavadhipati), 1);
  const maxDrishti = Math.max(...data.houses.map((house) => Math.abs(house.drishti)), 30);
  const totalScale = Math.max(data.strongest.totalPinda, data.referenceVirupas);

  const goHouse = (delta: number) => {
    onSelectHouse((((selected.house - 1 + delta) % 12) + 12) % 12 + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className={kundaliDetailClasses.bhavaChart.title}>{t("kundali.explore_houses")}</h3>
        <p className={kundaliDetailClasses.prose.mutedMt1}>{t("kundali.explore_houses_hint")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <BhavaDiamond
          houses={data.houses}
          selectedHouse={selected.house}
          onSelectHouse={onSelectHouse}
        />
        <HouseInspector
          house={selected}
          rashi={rashi}
          occupants={occupants}
          rank={rankByHouse.get(selected.house) ?? 1}
          totalHouses={data.houses.length}
          band={band}
          isStrongest={selected.house === data.strongest.house}
          totalScale={totalScale}
          maxBhavadhipati={maxBhavadhipati}
          maxDrishti={maxDrishti}
          reference={referenceQ.data}
          onPrev={() => goHouse(-1)}
          onNext={() => goHouse(1)}
        />
      </div>

      <div className={cn(kundaliDetailClasses.bhavaChart.legend, kundaliDetailClasses.bhavaChart.legendText, "flex")}>
        <LegendSwatch className={kundaliDetailClasses.bhavaChart.barPrimary} label={t("kundali.report.confidence_strong")} />
        <LegendSwatch className="bg-muted-foreground" label={t("kundali.average_strength")} />
        <LegendSwatch className="bg-destructive" label={t("kundali.x.status_weak")} />
      </div>
      <p className={kundaliDetailClasses.prose.muted}>{t("kundali.explore_houses_legend")}</p>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className={cn(kundaliDetailClasses.bhavaChart.swatch, "inline-flex")}>
      <span className={cn(kundaliDetailClasses.bhavaChart.swatchDot, className)} aria-hidden />
      {label}
    </span>
  );
}

function BhavaDiamond({
  houses,
  selectedHouse,
  onSelectHouse,
}: {
  houses: BhavaBalaHouse[];
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const byHouse = useMemo(() => new Map(houses.map((house) => [house.house, house])), [houses]);

  return (
    <div className={kundaliDetailClasses.bhavaChart.panel}>
      <svg
        viewBox="0 0 300 300"
        className="mx-auto h-auto w-full max-w-[420px]"
        role="img"
        aria-label={t("kundali.bhava_bala_chart")}
      >
        <rect
          x="0"
          y="0"
          width="300"
          height="300"
          className="fill-background stroke-border"
          strokeWidth="1.5"
          rx="4"
        />
        <line x1="0" y1="0" x2="300" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <line x1="300" y1="0" x2="0" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <polygon
          points="150,0 300,150 150,300 0,150"
          className="fill-none stroke-border/80"
          strokeWidth="1.25"
        />

        {Object.entries(NI_HOUSE_POLYGONS).map(([houseStr, points]) => {
          const houseNum = Number(houseStr);
          const house = byHouse.get(houseNum);
          if (!house) return null;
          const [cx, cy] = polygonCentroid(points);
          const [nx, ny] = houseNumberPos(points);
          const selected = houseNum === selectedHouse;
          const band = strengthBand(house.percent);
          return (
            <g
              key={houseNum}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={bilingualText(
                lang,
                `भाव ${digits(houseNum)}, ${digits(Math.round(house.totalPinda))} विरुप`,
                `House ${houseNum}, ${Math.round(house.totalPinda)} virupas`,
              )}
              className="cursor-pointer outline-none"
              onClick={() => onSelectHouse(houseNum)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectHouse(houseNum);
                }
              }}
            >
              <polygon
                points={pointsToSvg(points)}
                className={cn(selected ? "fill-primary/20" : "fill-transparent")}
                style={{ pointerEvents: "all" }}
              />
              {selected && (
                <polygon
                  points={pointsToSvg(points)}
                  className="fill-none stroke-primary"
                  strokeWidth="1.6"
                  style={{ pointerEvents: "none" }}
                />
              )}
              <text
                x={nx}
                y={ny}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-diagram-xs font-semibold"
                style={{ pointerEvents: "none" }}
              >
                {digits(houseNum)}
              </text>
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                className={cn("text-base font-bold tabular-nums", scoreFillClass(band))}
                style={{ pointerEvents: "none" }}
              >
                {digits(Math.round(house.totalPinda))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HouseInspector({
  house,
  rashi,
  occupants,
  rank,
  totalHouses,
  band,
  isStrongest,
  totalScale,
  maxBhavadhipati,
  maxDrishti,
  reference,
  onPrev,
  onNext,
}: {
  house: BhavaBalaHouse;
  rashi: number;
  occupants: BhavaHouse["planets"];
  rank: number;
  totalHouses: number;
  band: StrengthBand;
  isStrongest: boolean;
  totalScale: number;
  maxBhavadhipati: number;
  maxDrishti: number;
  reference?: BhavaReferencePayload;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const lordKey = house.lordKey as GrahaKey;
  const lordName = bilingualText(lang, GRAHA_NAME[lordKey]?.ne, GRAHA_NAME[lordKey]?.en, house.lordName);
  const classes = houseClasses(house.house);
  const titles =
    reference?.houseDetail[house.house] != null
      ? bilingualText(
          lang,
          reference.houseDetail[house.house].titlesNe,
          reference.houseDetail[house.house].titlesEn,
        )
      : reference?.houseInfo[house.house] != null
        ? bilingualText(lang, reference.houseInfo[house.house].themeNe, reference.houseInfo[house.house].themeEn)
        : "";
  const signifies = splitList(titles);
  const classical = reference?.houseClassicalName[house.house];

  return (
    <div className={cn(kundaliDetailClasses.bhavaChart.inspector, "space-y-4")}>
      <div className={cn(kundaliDetailClasses.bhavaChart.inspectorHead, "flex")}>
        <div>
          <p className={kundaliDetailClasses.bhavaChart.houseTitle}>
            <span className={cn(kundaliDetailClasses.bhavaChart.houseNum, kundaliDetailClasses.bhavaChart.houseNumText, "mr-2 inline-flex")}>
              {digits(house.house)}
            </span>
            {formatRashiByNumber(rashi, lang)}
            {classical ? (
              <span className={kundaliDetailClasses.bhavaChart.classical}>
                · {bilingualText(lang, classical.ne, classical.en)}
              </span>
            ) : null}
          </p>
        </div>
        <div className={cn(kundaliDetailClasses.bhavaChart.navRow, "flex")}>
          <Button type="button" variant="outline" size="icon-sm" onClick={onPrev} aria-label={t("kundali.previous_house")}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={onNext} aria-label={t("kundali.next_house")}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className={cn(kundaliDetailClasses.bhavaChart.metaRow, kundaliDetailClasses.bhavaChart.metaText, "flex")}>
        <span className="inline-flex items-center gap-1.5">
          {t("kundali.ruled_by")}
          <GrahaPlanetIcon graha={lordKey} size={18} />
          <span className={kundaliDetailClasses.prose.strong}>{lordName}</span>
        </span>
        {classes.length > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{classes.map((cls) => t(HOUSE_CLASS_LABEL[cls])).join(" · ")}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span>{t("kundali.house_rank", { rank: digits(rank), total: digits(totalHouses) })}</span>
        <StrengthBadge band={band} isStrongest={isStrongest} />
      </div>

      <div>
        <div className={cn(kundaliDetailClasses.bhavaChart.scoreHead, "flex")}>
          <p className={kundaliDetailClasses.prose.heading}>{t("kundali.nav_bhava_bala")}</p>
          <p className={cn(kundaliDetailClasses.bhavaChart.score, scoreTextClass(band))}>
            {t("kundali.virupas_rupas", {
              virupas: digits(house.totalPinda.toFixed(1)),
              rupas: digits(house.rupas.toFixed(2)),
            })}
          </p>
        </div>
        <div className={kundaliDetailClasses.bhavaChart.tileMeter}>
          <Meter value={house.totalPinda} max={totalScale} className={kundaliDetailClasses.bhavaChart.barPrimary} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ComponentTile
          label={t("kundali.bhavadhipati")}
          value={house.bhavadhipati}
          max={maxBhavadhipati}
          barClass={kundaliDetailClasses.bhavaChart.barPrimary}
          digits={digits}
        />
        <ComponentTile
          label={t("kundali.bhava_disha")}
          value={house.disha}
          max={60}
          barClass={kundaliDetailClasses.bhavaChart.barSecondary}
          digits={digits}
        />
        <ComponentTile
          label={t("kundali.bhava_drishti")}
          value={house.drishti}
          max={maxDrishti}
          barClass={kundaliDetailClasses.bhavaChart.barAccent}
          digits={digits}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={kundaliDetailClasses.bhavaChart.groupLabel}>
            {t("kundali.signifies")}
          </p>
          <div className={cn(kundaliDetailClasses.bhavaChart.chips, "flex")}>
            {signifies.length > 0 ? (
              signifies.map((item) => <Chip key={item}>{item}</Chip>)
            ) : (
              <p className={kundaliDetailClasses.prose.muted}>—</p>
            )}
          </div>
        </div>
        <div>
          <p className={kundaliDetailClasses.bhavaChart.groupLabel}>
            {t("kundali.occupants")}
          </p>
          {occupants.length > 0 ? (
            <div className={cn(kundaliDetailClasses.bhavaChart.chips, "flex")}>
              {occupants.map((planet) => {
                const key = planet.key as GrahaKey;
                return (
                  <Chip key={planet.key}>
                    <span className="inline-flex items-center gap-1.5">
                      <GrahaPlanetIcon graha={key} size={16} />
                      {bilingualText(lang, GRAHA_NAME[key]?.ne, GRAHA_NAME[key]?.en, planet.labelNe)}
                    </span>
                  </Chip>
                );
              })}
            </div>
          ) : (
            <p className={kundaliDetailClasses.prose.muted}>{t("kundali.no_occupants")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
