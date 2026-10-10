import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { BhavaBalaData, BhavaBalaHouse, BhavaReferencePayload, VargaCharts } from "@/lib/api";
import { bhavaReferenceKeys, fetchBhavaReference } from "@/lib/api";
import {
  buildBhavaChart,
  houseClasses,
  type BhavaHouse,
  type HouseClass,
} from "@/lib/bhava";
import { splitList } from "@/lib/kundali/bhava-detail";
import {
  NI_HOUSE_POLYGONS,
  pointsToSvg,
  polygonCentroid,
  type Point,
} from "@/lib/kundali/north-indian-layout";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHART_CENTER: Point = [150, 150];
const HOUSE_CLASS_LABEL: Record<HouseClass, string> = {
  kendra: "kundali.kendra",
  trikona: "kundali.trikona",
  dusthana: "kundali.dusthana",
  upachaya: "kundali.upachaya",
};

type StrengthBand = "strong" | "average" | "weak";

function strengthBand(percent: number): StrengthBand {
  if (percent >= 100) return "strong";
  if (percent >= 80) return "average";
  return "weak";
}

function scoreFillClass(band: StrengthBand): string {
  if (band === "strong") return "fill-primary";
  if (band === "weak") return "fill-destructive";
  return "fill-muted-foreground";
}

function scoreTextClass(band: StrengthBand): string {
  if (band === "strong") return "text-primary";
  if (band === "weak") return "text-destructive";
  return "text-muted-foreground";
}

function farthestFromCenter(points: Point[], center: Point): Point {
  return points.reduce((best, point) => {
    const dist = (point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2;
    const bestDist = (best[0] - center[0]) ** 2 + (best[1] - center[1]) ** 2;
    return dist > bestDist ? point : best;
  });
}

function houseNumberPos(points: Point[]): Point {
  const [cx, cy] = polygonCentroid(points);
  const [ox, oy] = farthestFromCenter(points, CHART_CENTER);
  return [cx + (ox - cx) * 0.58, cy + (oy - cy) * 0.58];
}

function rashiFromMadhya(madhyaLongitude: number): number {
  const lon = ((madhyaLongitude % 360) + 360) % 360;
  return Math.floor(lon / 30) + 1;
}

function clampPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
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
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${width}%` }} />
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
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
        {digits(signed)}
      </p>
      <div className="mt-2">
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold",
        isStrongest || band === "strong"
          ? "border-primary/30 bg-primary/10 text-primary"
          : band === "weak"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-sm text-foreground">
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
        <h3 className="text-base font-semibold text-foreground">{t("kundali.explore_houses")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("kundali.explore_houses_hint")}</p>
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

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <LegendSwatch className="bg-primary" label={t("kundali.report.confidence_strong")} />
        <LegendSwatch className="bg-muted-foreground" label={t("kundali.average_strength")} />
        <LegendSwatch className="bg-destructive" label={t("kundali.x.status_weak")} />
      </div>
      <p className="text-sm text-muted-foreground">{t("kundali.explore_houses_legend")}</p>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
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
    <div className="rounded-xl border border-border bg-background/70 p-3 sm:p-4">
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
                className="fill-muted-foreground text-[9px] font-semibold"
                style={{ pointerEvents: "none" }}
              >
                {digits(houseNum)}
              </text>
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                className={cn("text-[15px] font-bold tabular-nums", scoreFillClass(band))}
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
    <div className="min-w-0 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-foreground">
            <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {digits(house.house)}
            </span>
            {formatRashiByNumber(rashi, lang)}
            {classical ? (
              <span className="ml-1.5 text-base font-normal text-muted-foreground">
                · {bilingualText(lang, classical.ne, classical.en)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="outline" size="icon-sm" onClick={onPrev} aria-label={t("kundali.previous_house")}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={onNext} aria-label={t("kundali.next_house")}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {t("kundali.ruled_by")}
          <GrahaPlanetIcon graha={lordKey} size={18} />
          <span className="font-semibold text-foreground">{lordName}</span>
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
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{t("kundali.nav_bhava_bala")}</p>
          <p className={cn("font-mono text-sm font-semibold tabular-nums", scoreTextClass(band))}>
            {t("kundali.virupas_rupas", {
              virupas: digits(house.totalPinda.toFixed(1)),
              rupas: digits(house.rupas.toFixed(2)),
            })}
          </p>
        </div>
        <div className="mt-2">
          <Meter value={house.totalPinda} max={totalScale} className="bg-primary" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ComponentTile
          label={t("kundali.bhavadhipati")}
          value={house.bhavadhipati}
          max={maxBhavadhipati}
          barClass="bg-primary"
          digits={digits}
        />
        <ComponentTile
          label={t("kundali.bhava_disha")}
          value={house.disha}
          max={60}
          barClass="bg-secondary"
          digits={digits}
        />
        <ComponentTile
          label={t("kundali.bhava_drishti")}
          value={house.drishti}
          max={maxDrishti}
          barClass="bg-accent"
          digits={digits}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("kundali.signifies")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {signifies.length > 0 ? (
              signifies.map((item) => <Chip key={item}>{item}</Chip>)
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("kundali.occupants")}
          </p>
          {occupants.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
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
            <p className="text-sm text-muted-foreground">{t("kundali.no_occupants")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
