import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Flame, RotateCcw } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { VargaChartEntry } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** One body's astronomical readout — sidereal longitude plus equatorial extras. */
export type GrahaAstroPoint = {
  longitude?: number;
  retrograde?: boolean;
  latitude?: number;
  rightAscension?: number;
  declination?: number;
  speed?: number;
};

export type GrahaAstroTableProps = {
  /** Keyed by graha ("sun" … "ketu"). */
  planets: Partial<Record<string, GrahaAstroPoint>>;
  lagna?: GrahaAstroPoint;
  /** Server-computed D1 rows (DMS, nakshatra pada, lord). */
  d1Rows: VargaChartEntry[];
  /** Server-computed combustion flags keyed by graha. */
  combustion: Record<string, boolean | null>;
};

type Row = GrahaAstroPoint &
  VargaChartEntry & {
    lon: number;
    combust?: boolean;
  };

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-2 text-sm";

function signedFixed(value: number | undefined, digits: (v: string) => string): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(2);
  return `${value < 0 ? "−" : "+"}${digits(abs)}`;
}

/**
 * Astronomical graha table (D1): longitude with nakshatra/lord, raw sidereal
 * longitude, shara (ecliptic latitude), right ascension, kranti (declination)
 * and daily speed — retrograde/combust badges inline on the graha column.
 * columns come straight from the API's D1 varga rows.
 */
export function GrahaAstroTable({ planets, lagna, d1Rows, combustion }: GrahaAstroTableProps) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();

  const rows = useMemo<Row[]>(() => {
    return d1Rows.flatMap((entry) => {
      const point = entry.key === "lagna" ? lagna : planets[entry.key];
      if (point?.longitude == null) return [];
      return [
        {
          ...point,
          ...entry,
          lon: point.longitude,
          combust:
            entry.key !== "lagna" ? combustion[entry.key] ?? undefined : undefined,
        },
      ];
    });
  }, [d1Rows, planets, lagna, combustion]);

  if (rows.length === 0) return null;

  const grahaName = (key: string) =>
    bilingualText(lang, GRAHA_NAME[key as GrahaKey]?.ne ?? key, GRAHA_NAME[key as GrahaKey]?.en ?? key);
  const rashiName = (rashi: number) => formatRashiByNumber(rashi, lang);

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3.5 normal-case")}>
            {t("kundali.graha_r_c")}
          </TableHead>
          <TableHead className={th}>{t("kundali.longitude")}</TableHead>
          <TableHead className={th}>{t("kundali.nakshatra_swami")}</TableHead>
          <TableHead className={cn(th, "text-right")}>{t("kundali.raw_l")}</TableHead>
          <TableHead className={cn(th, "text-right")}>{t("kundali.latitude_shara")}</TableHead>
          <TableHead className={cn(th, "text-right")}>{t("kundali.right_ascension")}</TableHead>
          <TableHead className={cn(th, "text-right")}>{t("kundali.declination_kranti")}</TableHead>
          <TableHead className={cn(th, "text-right")}>{t("kundali.speed_deg_day")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const name = row.key === "lagna" ? t("kundali.lagna") : grahaName(row.key);
          const nakName = bilingualText(lang, NAKSHATRA_ICONS[row.nakshatraIndex]?.ne ?? "—", NAKSHATRA_ICONS[row.nakshatraIndex]?.en ?? "—");
          const zebra = i % 2 === 1 && "bg-muted/20";
          return (
            <TableRow key={row.key} className={cn(zebra)}>
              <TableCell
                className={cn(
                  td,
                  "sticky left-0 z-10 bg-card pl-3.5 font-semibold text-foreground",
                  zebra && "bg-[color-mix(in_srgb,var(--muted)_20%,var(--card))]",
                  row.retrograde &&
                    "bg-[color-mix(in_srgb,var(--secondary)_6%,var(--card))] dark:bg-[color-mix(in_srgb,var(--secondary)_10%,var(--card))]",
                )}
              >
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {row.key !== "lagna" && (
                    <GrahaPlanetIcon graha={row.key as GrahaKey} size={22} />
                  )}
                  {name}
                  {row.retrograde && (
                    <span
                      className="inline-flex items-center gap-0.5 text-sm font-bold normal-case text-secondary bg-secondary/15 px-1 py-0.5 rounded-full"
                      title={t("kundali.retrograde")}
                    >
                      <RotateCcw className="size-2.5" aria-hidden />
                      {t("kundali.r")}
                    </span>
                  )}
                  {row.combust && (
                    <span
                      className="inline-flex items-center gap-0.5 text-sm font-bold normal-case text-destructive bg-destructive/10 px-1 py-0.5 rounded-full"
                      title={t("kundali.combust")}
                    >
                      <Flame className="size-2.5" aria-hidden />
                      {t("kundali.c")}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(td, "font-mono tabular-nums")}>
                <span className="text-foreground font-semibold">
                  {digits(String(row.dms.deg).padStart(2, "0"))}°
                </span>{" "}
                <span className="font-sans text-foreground">{rashiName(row.dms.rashiNum)}</span>{" "}
                {digits(String(row.dms.min).padStart(2, "0"))}′{" "}
                {digits(String(row.dms.sec).padStart(2, "0"))}″
              </TableCell>
              <TableCell className={td}>
                {nakName} {digits(row.pada)}
                <span>, {grahaName(row.nakshatraLord)}</span>
              </TableCell>
              <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                {digits(row.lon.toFixed(2))}
              </TableCell>
              <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                {signedFixed(row.latitude, digits)}
              </TableCell>
              <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                {signedFixed(row.rightAscension, digits)}
              </TableCell>
              <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                {signedFixed(row.declination, digits)}
              </TableCell>
              <TableCell className={cn(td, "text-right font-mono tabular-nums")}>
                {signedFixed(row.speed, digits)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
