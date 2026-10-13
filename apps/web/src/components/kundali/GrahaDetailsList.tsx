import { useMemo } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { RotateCcw } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { VargaChartEntry, VargaCharts } from "@/lib/api";
import { rashiToHouse } from "@vedic-patro/domain/bhava";
import {
  DIGNITY_LABELS,
  GRAHA_NAME,
  RELATION_LABELS,
  type GrahaKey,
} from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Row = VargaChartEntry & {
  bhava: number;
  ownerBhava?: number;
  rulesBhavas: number[];
};

const g = kundaliDetailClasses.grahaList;
const th = kundaliDetailClasses.table.th;
const td = kundaliDetailClasses.table.td;

export type GrahaDetailsListProps = {
  division: number;
  /** Key of this chart's house-1 anchor (lagna / moon / …). */
  anchorKey: string;
  /** Server-computed varga placements for every point. */
  vargaCharts: VargaCharts;
};

/**
 * Detailed graha table for one divisional chart. All jyotish values (varga
 * sign, DMS, nakshatra pada with lord / KP sub-lord, owner, relationship,
 * dignity) come from the API — only the whole-sign house arrangement relative
 * to the chosen anchor is applied here.
 */
export function GrahaDetailsList({
  division,
  anchorKey,
  vargaCharts,
}: GrahaDetailsListProps) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();

  const rows = useMemo<Row[]>(() => {
    const entries = vargaCharts.entries[String(division)] ?? [];
    const anchorEntry = entries.find((e) => e.key === anchorKey);
    if (!anchorEntry) return [];
    const anchorRashi = anchorEntry.vargaRashi;
    const byKey = new Map(entries.map((e) => [e.key, e]));

    return entries.map((entry) => {
      const owner = byKey.get(entry.ownerKey);
      const rules = vargaCharts.ownedRashis[entry.key] ?? [];
      return {
        ...entry,
        bhava: rashiToHouse(entry.vargaRashi, anchorRashi),
        ownerBhava: owner ? rashiToHouse(owner.vargaRashi, anchorRashi) : undefined,
        rulesBhavas:
          entry.key !== "lagna"
            ? rules.map((rashi) => rashiToHouse(rashi, anchorRashi)).sort((a, b) => a - b)
            : [],
      };
    });
  }, [division, anchorKey, vargaCharts]);

  if (rows.length === 0) return null;

  const grahaName = (key: string) =>
    bilingualText(lang, GRAHA_NAME[key as GrahaKey]?.ne ?? key, GRAHA_NAME[key as GrahaKey]?.en ?? key);
  const rashiName = (rashi: number) => formatRashiByNumber(rashi, lang);

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3.5")}>
            {t("kundali.graha")}
          </TableHead>
          <TableHead className={th}>{t("kundali.rashi_longitude")}</TableHead>
          <TableHead className={cn(th, "text-center")}>{t("kundali.bhava_19")}</TableHead>
          <TableHead className={th}>{t("kundali.nakshatra_pada")}</TableHead>
          <TableHead className={th}>{t("kundali.lord_sub")}</TableHead>
          <TableHead className={th}>{t("kundali.owner")}</TableHead>
          <TableHead className={th}>{t("kundali.relationship")}</TableHead>
          <TableHead className={th}>{t("kundali.dignity")}</TableHead>
          <TableHead className={th}>{t("kundali.rules")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const name = row.key === "lagna" ? t("kundali.lagna") : grahaName(row.key);
          const nakName = bilingualText(lang, NAKSHATRA_ICONS[row.nakshatraIndex]?.ne ?? "—", NAKSHATRA_ICONS[row.nakshatraIndex]?.en ?? "—");
          const zebra = i % 2 === 1 && "bg-muted/20";
          return (
            <TableRow
              key={row.key}
              className={cn(zebra, row.retrograde && "bg-secondary/[0.06] dark:bg-secondary/10")}
            >
              {/* Sticky cell needs an opaque background so scrolled columns
                  don't show through — blend the row tint into the card color. */}
              <TableCell
                className={cn(
                  td,
                  "sticky left-0 z-10 bg-card pl-3.5",
                  g.name,
                  zebra && "bg-[color-mix(in_srgb,var(--muted)_20%,var(--card))]",
                  row.retrograde &&
                    "bg-[color-mix(in_srgb,var(--secondary)_6%,var(--card))] dark:bg-[color-mix(in_srgb,var(--secondary)_10%,var(--card))]",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {row.key !== "lagna" && (
                    <GrahaPlanetIcon graha={row.key as GrahaKey} size={22} />
                  )}
                  {name}
                  {row.retrograde && (
                    <span
                      className={cn(g.retroBadge, g.retroText, "inline-flex normal-case")}
                      title={t("kundali.retrograde")}
                    >
                      <RotateCcw className="size-2.5" aria-hidden />
                      {t("kundali.r")}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(td, g.dms)}>
                <span className={g.dmsDeg}>
                  {digits(String(row.dms.deg).padStart(2, "0"))}°
                </span>{" "}
                <span className={cn(g.dmsRashi, "font-sans")}>{rashiName(row.dms.rashiNum)}</span>{" "}
                {digits(String(row.dms.min).padStart(2, "0"))}′{" "}
                {digits(String(row.dms.sec).padStart(2, "0"))}″
              </TableCell>
              <TableCell className={cn(td, g.bhava)}>
                {digits(row.bhava)}
              </TableCell>
              <TableCell className={td}>
                {nakName}
                <span> ({digits(row.pada)})</span>
              </TableCell>
              <TableCell className={td}>
                {grahaName(row.nakshatraLord)}
                <span className="mx-1">/</span>
                {grahaName(row.subLord)}
              </TableCell>
              <TableCell className={td}>
                {grahaName(row.ownerKey)}
                {row.ownerBhava != null && (
                  <span>
                    {" "}
                    {bilingualText(lang, `(भाव ${digits(row.ownerBhava)})`, `(bhava ${digits(row.ownerBhava)})`)}
                  </span>
                )}
              </TableCell>
              <TableCell className={td}>
                {row.relation
                  ? bilingualText(lang, RELATION_LABELS[row.relation].ne, RELATION_LABELS[row.relation].en)
                  : "—"}
              </TableCell>
              <TableCell className={td}>
                {row.dignity
                  ? bilingualText(lang, DIGNITY_LABELS[row.dignity].ne, DIGNITY_LABELS[row.dignity].en)
                  : "—"}
              </TableCell>
              <TableCell className={td}>
                {row.rulesBhavas.length > 0
                  ? bilingualText(lang, `भाव ${row.rulesBhavas.map((h) => digits(h)).join(", ")}`, `Bhava ${row.rulesBhavas.map((h) => digits(h)).join(", ")}`)
                  : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
