/**
 * The detailed graha table for one divisional chart, shared by the website's
 * and the app's `components/kundali/GrahaDetailsList.tsx`. All jyotish values
 * (varga sign, DMS, nakshatra pada with lord / KP sub-lord, owner,
 * relationship, dignity) come from the API — only the whole-sign house
 * arrangement relative to the chosen anchor is applied here.
 */
import { useMemo } from "react";
import type { VargaCharts } from "@vedic-patro/api-client";
import { rashiToHouse } from "@vedic-patro/domain/bhava";
import { DIGNITY_LABELS, GRAHA_NAME, RELATION_LABELS, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

const COLUMN_KEYS = [
  ["graha", "kundali.graha"],
  ["rashi_lon", "kundali.rashi_longitude"],
  ["bhava", "kundali.bhava_19"],
  ["nak", "kundali.nakshatra_pada"],
  ["lord_sub", "kundali.lord_sub"],
  ["owner", "kundali.owner"],
  ["rel", "kundali.relationship"],
  ["dignity", "kundali.dignity"],
  ["rules", "kundali.rules"],
] as const;

export type GrahaDetailsInput = {
  division: number;
  /** Key of this chart's house-1 anchor (lagna / moon / …). */
  anchorKey: string;
  /** Server-computed varga placements for every point. */
  vargaCharts: VargaCharts;
};

export function useGrahaDetailsList({ division, anchorKey, vargaCharts }: GrahaDetailsInput) {
  const { t, lang, digits } = useLocale();

  const placed = useMemo(() => {
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
        rulesBhavas: entry.key !== "lagna" ? rules.map((rashi) => rashiToHouse(rashi, anchorRashi)).sort((a, b) => a - b) : [],
      };
    });
  }, [division, anchorKey, vargaCharts]);

  const grahaName = (key: string) => bilingualText(lang, GRAHA_NAME[key as GrahaKey]?.ne ?? key, GRAHA_NAME[key as GrahaKey]?.en ?? key);
  const pad = (n: number) => digits(String(n).padStart(2, "0"));

  return {
    columns: COLUMN_KEYS.map(([key, label]) => ({ key, label: t(label) })),
    retroTitle: t("kundali.retrograde"),
    retroLabel: t("kundali.r"),
    rows: placed.map((row) => {
      const nak = NAKSHATRA_ICONS[row.nakshatraIndex];
      return {
        key: row.key,
        isLagna: row.key === "lagna",
        name: row.key === "lagna" ? t("kundali.lagna") : grahaName(row.key),
        retrograde: Boolean(row.retrograde),
        deg: `${pad(row.dms.deg)}°`,
        rashiNum: row.dms.rashiNum,
        rashiName: formatRashiByNumber(row.dms.rashiNum, lang),
        min: `${pad(row.dms.min)}′`,
        sec: `${pad(row.dms.sec)}″`,
        bhava: digits(row.bhava),
        nakshatraIndex: row.nakshatraIndex,
        nakshatraNe: nak?.ne,
        nakName: bilingualText(lang, nak?.ne ?? "—", nak?.en ?? "—"),
        pada: `(${digits(row.pada)})`,
        nakLord: { key: row.nakshatraLord, name: grahaName(row.nakshatraLord) },
        subLord: { key: row.subLord, name: grahaName(row.subLord) },
        owner: {
          key: row.ownerKey,
          name: grahaName(row.ownerKey),
          bhava: row.ownerBhava != null ? t("ui.kundali.bhava_ownerbhava", { ownerBhava: digits(row.ownerBhava) }) : null,
        },
        relation: row.relation ? bilingualText(lang, RELATION_LABELS[row.relation].ne, RELATION_LABELS[row.relation].en) : "—",
        dignity: row.dignity ? bilingualText(lang, DIGNITY_LABELS[row.dignity].ne, DIGNITY_LABELS[row.dignity].en) : "—",
        rules: row.rulesBhavas.length > 0 ? t("ui.kundali.bhava_value", { value: row.rulesBhavas.map((h) => digits(h)).join(", ") }) : "—",
      };
    }),
  };
}
