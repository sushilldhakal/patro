import { useMemo, useState } from "react";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import type {
  JanmaAvakahadaData,
  KundaliYoga,
  UpagrahaDetailRow,
  VargaChartEntry,
  VargaCharts,
} from "@/lib/api";
import {
  buildBhavaTable,
  formatHouseBadge,
  type BhavaTableRow,
  RASHI_QUALITIES,
} from "@vedic-patro/domain/jyotish/bhava";
import {
  GrahaInline,
  GrahaInlineChildren,
  GrahaKeysRow,
  NakshatraInline,
  RashiInline,
} from "@/components/kundali/KundaliGlyphLabels";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { kundaliLabel, type KundaliI18nKey } from "@/lib/kundali/kundali-i18n";
import { useLocale } from "@/lib/i18n";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/panchanga/nakshatra-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiByNumber } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import {
  brand,
  panchangaSection,
  panchangaSectionHeader,
  panchangaSectionTitle,
} from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";

import { tFor } from "@vedic-patro/i18n/runtime";
export function grahaName(key: string, lang: "ne" | "en"): string {
  const meta = GRAHA_NAME[key as GrahaKey];
  if (key === "lagna") return tFor(lang, "ui.kundali.ascendant");
  if (!meta) return key;
  return lang === "en" ? meta.en : meta.ne;
}

/** Card shell with a title bar — the mobile stand-in for the web PanchangaSection. */
export function KundaliSection({
  title,
  subtitle,
  children,
  edgeToEdgeContent = false,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  /** Tables flush to card horizontal edges (no side padding). */
  edgeToEdgeContent?: boolean;
}) {
  return (
    <View className={cn(panchangaSection, "mb-4")}>
      <View className={panchangaSectionHeader}>
        <Text className={panchangaSectionTitle} style={nepaliTextStyle(14)}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={kundaliDetailClasses.prose.smallMuted} style={nepaliTextStyle(11)}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className={edgeToEdgeContent ? undefined : "p-4"}>{children}</View>
    </View>
  );
}

/* ── generic scrollable table ──────────────────────────────────────────── */

export type { Column, TableColumn } from "@/components/ui/DataTable";
export { DataTable } from "@/components/ui/DataTable";

function nakshatraLabel(index: number, lang: "ne" | "en"): string {
  const icon = NAKSHATRA_ICONS[index];
  if (!icon) return "—";
  return lang === "en" ? icon.en : icon.ne;
}

/* ── graha positions (D1) ──────────────────────────────────────────────── */

export function GrahaAstroTable({
  d1Rows,
  points,
  combustion,
}: {
  d1Rows: VargaChartEntry[];
  points: VargaCharts["points"];
  combustion: Record<string, boolean | null>;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();

  const columns: Column[] = [
    { key: "graha", ne: tFor("ne", "kundali.graha"), en: tFor("en", "kundali.graha"), width: 118 },
    { key: "rashi", ne: tFor("ne", "panchanga.wheel.rashi"), en: tFor("en", "panchanga.wheel.rashi"), width: 104 },
    { key: "dms", ne: tFor("ne", "ui.kundali.degree"), en: tFor("en", "ui.kundali.degree"), width: 108 },
    { key: "nak", ne: tFor("ne", "graha_pages.sthiti.columns.nakshatra_pada"), en: tFor("en", "graha_pages.sthiti.columns.nakshatra_pada"), width: 150 },
    { key: "lord", ne: tFor("ne", "ui.kundali.lord_sub"), en: tFor("en", "ui.kundali.lord_sub"), width: 132 },
    { key: "lon", ne: tFor("ne", "ui.kundali.longitude"), en: tFor("en", "ui.kundali.longitude"), width: 96 },
  ];

  const rows = d1Rows.map((e) => {
    const point = points[e.key];
    const combust = combustion[e.key];
    const dms = `${digits(e.dms.deg)}° ${digits(e.dms.min)}′ ${digits(e.dms.sec)}″`;
    return {
      key: e.key,
      highlight: e.key === "lagna",
      cells: [
        <GrahaInlineChildren grahaKey={e.key} size={20}>
          <Text
            className={kundaliDetailClasses.prose.heading}
            style={nepaliTextStyle(12)}
            numberOfLines={1}
          >
            {grahaName(e.key, lang)}
          </Text>
          {e.retrograde ? (
            <Text style={{ color: colors.danger }} className="text-sm font-bold">↺
            </Text>
          ) : null}
          {combust ? <Text className="text-caption">🔥</Text> : null}
        </GrahaInlineChildren>,
        <RashiInline key="r" rashiNum={e.vargaRashi} lang={lang} size={18} textSize={12} />,
        <Text key="d" className="font-mono text-sm text-foreground">
          {dms}
        </Text>,
        <NakshatraInline index={e.nakshatraIndex} lang={lang} pada={e.pada} digits={digits} size={16} textSize={11} />,
        <View key="lord" className="flex-row flex-wrap items-center gap-1">
          <GrahaInline grahaKey={e.nakshatraLord} label={grahaName(e.nakshatraLord, lang)} size={14} textSize={11} />
          <Text style={nepaliTextStyle(11)}>/</Text>
          <GrahaInline grahaKey={e.subLord} label={grahaName(e.subLord, lang)} size={14} textSize={11} />
        </View>,
        <Text key="l" className="font-mono text-sm text-foreground">
          {point?.longitude != null ? digits(point.longitude.toFixed(2)) : "—"}
        </Text>,
      ],
    };
  });

  return <DataTable stretch columns={columns} rows={rows} />;
}

/* ── bhava (house) table ───────────────────────────────────────────────── */

export function BhavaTable({
  division,
  anchorKey,
  vargaCharts,
}: {
  division: number;
  anchorKey: string;
  vargaCharts: VargaCharts;
}) {
  const { lang, pick, digits } = useLocale();

  const rows = useMemo<BhavaTableRow[]>(() => {
    const entries = vargaCharts.entries[String(division)] ?? [];
    const anchorEntry = entries.find((e) => e.key === anchorKey);
    if (!anchorEntry) return [];

    const planetRashis = entries
      .filter((e) => e.key !== "lagna")
      .map((e) => ({
        key: e.key,
        labelNe: GRAHA_NAME[e.key as GrahaKey]?.ne ?? e.key,
        rashi: e.vargaRashi,
      }));

    return buildBhavaTable(
      anchorEntry.vargaRashi,
      planetRashis,
      vargaCharts.ownedRashis);
  }, [division, anchorKey, vargaCharts]);

  if (rows.length === 0) return null;

  const columns: Column[] = [
    { key: "house", ne: tFor("ne", "kundali.house"), en: tFor("en", "kundali.house"), width: 48 },
    { key: "residents", ne: tFor("ne", "kundali.residents"), en: tFor("en", "kundali.residents"), width: 104 },
    { key: "owner", ne: tFor("ne", "panchanga.wheel.lord"), en: tFor("en", "panchanga.wheel.lord"), width: 72 },
    { key: "rashi", ne: tFor("ne", "panchanga.wheel.rashi"), en: tFor("en", "panchanga.wheel.rashi"), width: 68 },
    { key: "qual", ne: tFor("ne", "kundali.qualities"), en: tFor("en", "kundali.qualities"), width: 88 },
    { key: "aspect", ne: tFor("ne", "kundali.aspected_by"), en: tFor("en", "kundali.aspected_by"), width: 108 },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows.map((r) => ({
        key: String(r.house),
        highlight: r.house === 1,
        cells: [
          <Text key="h" className="font-mono text-sm font-semibold text-foreground" style={nepaliTextStyle(11)}>
            {digits(r.house)}
            {r.badge ? (
              <Text className="text-muted-foreground"> ({formatHouseBadge(r.badge, lang)})</Text>
            ) : null}
          </Text>,
          r.residents.length ? (
            <GrahaKeysRow
              keys={r.residents.map((p) => p.key)}
              lang={lang}
              nameForKey={(k) => grahaName(k, lang)}
              size={14}
            />
          ) : (
            <Text style={nepaliTextStyle(11)}>—</Text>
          ),
          r.owner ? (
            <GrahaInline grahaKey={r.owner} label={grahaName(r.owner, lang)} size={14} textSize={11} />
          ) : (
            "—"
          ),
          <RashiInline key="rash" rashiNum={r.rashi} lang={lang} size={16} textSize={11} />,
          pick(RASHI_QUALITIES[r.rashi - 1]?.ne ?? "—", RASHI_QUALITIES[r.rashi - 1]?.en ?? "—"),
          r.aspectedBy.length ? (
            <GrahaKeysRow
              keys={r.aspectedBy}
              lang={lang}
              nameForKey={(k) => grahaName(k, lang)}
              size={14}
            />
          ) : (
            "—"
          ),
        ],
      }))}
    />
  );
}

/* ── upagraha table ────────────────────────────────────────────────────── */

export function UpagrahaTable({ rows }: { rows: UpagrahaDetailRow[] }) {
  const { lang, digits } = useLocale();
  if (!rows.length) return null;

  const columns: Column[] = [
    { key: "name", ne: tFor("ne", "kundali.nav_upagraha"), en: tFor("en", "kundali.nav_upagraha"), width: 132 },
    { key: "rashi", ne: tFor("ne", "panchanga.wheel.rashi"), en: tFor("en", "panchanga.wheel.rashi"), width: 104 },
    { key: "dms", ne: tFor("ne", "ui.kundali.degree"), en: tFor("en", "ui.kundali.degree"), width: 108 },
    { key: "nak", ne: tFor("ne", "graha_pages.sthiti.columns.nakshatra_pada"), en: tFor("en", "graha_pages.sthiti.columns.nakshatra_pada"), width: 150 },
    { key: "lord", ne: tFor("ne", "panchanga.wheel.lord"), en: tFor("en", "panchanga.wheel.lord"), width: 104 },
  ];

  return (
    <DataTable
      stretch
      columns={columns}
      rows={rows.map((r) => ({
        key: r.key,
        cells: [
          lang === "en" ? (r.name ?? r.key) : (r.name_ne ?? r.name ?? r.key),
          <RashiInline key="rash" rashiNum={r.dms.rashiNum} lang={lang} size={16} textSize={11} />,
          <Text key="d" className="font-mono text-sm text-foreground">
            {digits(r.dms.deg)}° {digits(r.dms.min)}′ {digits(r.dms.sec)}″
          </Text>,
          <NakshatraInline index={r.nakshatraIndex} lang={lang} pada={r.pada} digits={digits} size={16} />,
          <GrahaInline grahaKey={r.nakshatraLord} label={grahaName(r.nakshatraLord, lang)} size={14} textSize={11} />,
        ],
      }))}
    />
  );
}

/* ── yogas ─────────────────────────────────────────────────────────────── */

const YOGA_NATURE: Record<KundaliYoga["nature"], { ne: string; en: string; tone: string }> = {
  auspicious: { get ne() { return tFor("ne", "kundali.auspicious"); }, get en() { return tFor("en", "kundali.auspicious"); }, tone: brand.green },
  inauspicious: { get ne() { return tFor("ne", "kundali.inauspicious"); }, get en() { return tFor("en", "kundali.inauspicious"); }, tone: brand.vermilion },
  mixed: { get ne() { return tFor("ne", "ui.kundali.mixed"); }, get en() { return tFor("en", "ui.kundali.mixed"); }, tone: brand.saffron },
  caution: { get ne() { return tFor("ne", "kundali.caution"); }, get en() { return tFor("en", "kundali.caution"); }, tone: brand.saffron },
};

export function YogaList({ yogas }: { yogas: KundaliYoga[] }) {
  const { t, lang, pick } = useLocale();
  const present = yogas.filter((y) => y.present);

  if (!present.length) {
    return (
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
        {t("ui.kundali.no_major_yogas_found_in_this")}
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {present.map((y) => {
        const nature = YOGA_NATURE[y.nature];
        return (
          <View
            key={y.key}
            style={{ borderLeftColor: nature.tone, borderLeftWidth: 3 }}
            className="rounded-lg border border-border bg-background p-3"
          >
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(14)}>
                {lang === "en" ? y.nameEn : y.nameNe}
              </Text>
              <View
                style={{ backgroundColor: colorWithAlpha(nature.tone, 0.12) }}
                className="rounded-full px-2 py-0.5"
              >
                <Text
                  style={{ color: nature.tone, ...nepaliTextStyle(10) }}
                  className="text-sm font-semibold"
                >
                  {pick(nature.ne, nature.en)}
                </Text>
              </View>
            </View>
            <Text
              className="mt-1 text-sm leading-snug text-muted-foreground"
              style={nepaliTextStyle(13)}
            >
              {lang === "en" ? y.descEn : y.descNe}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ── avakahada (janma) ─────────────────────────────────────────────────── */

export function AvakahadaCard({ data }: { data: JanmaAvakahadaData }) {
  const { lang, digits } = useLocale();
  const t = (key: KundaliI18nKey) => kundaliLabel(key, lang);

  const rows: { label: string; value: string }[] = [
    {
      label: t("nakshatra"),
      value: `${lang === "en" ? data.nakshatra.en : data.nakshatra.ne} · ${t("pada")} ${digits(data.pada)}`,
    },
    { label: t("rashi_paya"), value: lang === "en" ? data.rashiPaya.en : data.rashiPaya.ne },
    { label: t("nakshatra_paya"), value: lang === "en" ? data.nakshatraPaya.en : data.nakshatraPaya.ne },
    { label: t("tattva"), value: lang === "en" ? data.tattva.en : data.tattva.ne },
    { label: t("yunja"), value: lang === "en" ? data.yunja.en : data.yunja.ne },
    { label: t("vashya"), value: lang === "en" ? data.vashya.en : data.vashya.ne },
    { label: t("tara"), value: lang === "en" ? data.tara.en : data.tara.ne },
    { label: t("gana"), value: lang === "en" ? data.gana.en : data.gana.ne },
    { label: t("akshara"), value: lang === "en" ? data.akshara.en : data.akshara.ne },
    { label: t("nadi"), value: lang === "en" ? data.nadi.en : data.nadi.ne },
    { label: t("asana"), value: lang === "en" ? data.asana.en : data.asana.ne },
    { label: t("yoni"), value: lang === "en" ? data.yoni.en : data.yoni.ne },
    { label: t("jati"), value: lang === "en" ? data.jati.en : data.jati.ne },
  ];

  return (
    <View className="flex-row flex-wrap">
      {rows.map((r) => (
        <View key={r.label} style={{ width: "50%" }} className="gap-0.5 pb-3 pr-3">
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
            {r.label}
          </Text>
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(13)}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
