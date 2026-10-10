import { useMemo, useState } from "react";
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
} from "@/lib/bhava";
import {
  GrahaInline,
  GrahaInlineChildren,
  GrahaKeysRow,
  NakshatraInline,
  RashiInline,
} from "@/components/kundali/KundaliGlyphLabels";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { kundaliLabel, type KundaliI18nKey } from "@/lib/kundali/kundali-i18n";
import { useLocale } from "@/lib/i18n";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiByNumber, rashiNeFromNumber } from "@/lib/rashi-i18n";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

export function grahaName(key: string, lang: "ne" | "en"): string {
  const meta = GRAHA_NAME[key as GrahaKey];
  if (key === "lagna") return lang === "en" ? "Ascendant" : "लग्न";
  if (!meta) return key;
  return lang === "en" ? meta.en : meta.ne;
}

/** Card shell with a title bar — the mobile stand-in for the web PanchangaSection. */
export function KundaliSection({
  title,
  subtitle,
  icon,
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
  const colors = useThemeColors();
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
        {icon ? <Ionicons name={icon} size={16} color={colors.secondary} /> : null}
        <View className="min-w-0 flex-1">
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(11)}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View className={edgeToEdgeContent ? "pb-3 pt-1" : "p-3"}>{children}</View>
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
    { key: "graha", ne: "ग्रह", en: "Graha", width: 118 },
    { key: "rashi", ne: "राशि", en: "Rashi", width: 104 },
    { key: "dms", ne: "अंश", en: "Degree", width: 108 },
    { key: "nak", ne: "नक्षत्र / पद", en: "Nakshatra / Pada", width: 150 },
    { key: "lord", ne: "स्वामी / उप", en: "Lord / Sub", width: 132 },
    { key: "lon", ne: "स्पष्ट", en: "Longitude", width: 96 },
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
            className="text-caption font-semibold text-foreground"
            style={nepaliTextStyle(12)}
            numberOfLines={1}
          >
            {grahaName(e.key, lang)}
          </Text>
          {e.retrograde ? (
            <Text style={{ color: colors.danger }} className="text-caption font-bold">
              ↺
            </Text>
          ) : null}
          {combust ? <Text className="text-caption">🔥</Text> : null}
        </GrahaInlineChildren>,
        <RashiInline key="r" rashiNum={e.vargaRashi} lang={lang} size={18} textSize={12} />,
        <Text key="d" className="text-caption font-num text-foreground">
          {dms}
        </Text>,
        <NakshatraInline index={e.nakshatraIndex} lang={lang} pada={e.pada} digits={digits} size={16} textSize={11} />,
        <View key="lord" className="flex-row flex-wrap items-center gap-1">
          <GrahaInline grahaKey={e.nakshatraLord} label={grahaName(e.nakshatraLord, lang)} size={14} textSize={11} />
          <Text style={nepaliTextStyle(11)}>/</Text>
          <GrahaInline grahaKey={e.subLord} label={grahaName(e.subLord, lang)} size={14} textSize={11} />
        </View>,
        <Text key="l" className="text-caption font-num text-foreground">
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
      vargaCharts.ownedRashis,
      rashiNeFromNumber,
    );
  }, [division, anchorKey, vargaCharts]);

  if (rows.length === 0) return null;

  const columns: Column[] = [
    { key: "house", ne: "भाव", en: "House", width: 48 },
    { key: "residents", ne: "बासिन्दा", en: "Residents", width: 104 },
    { key: "owner", ne: "स्वामी", en: "Lord", width: 72 },
    { key: "rashi", ne: "राशि", en: "Rashi", width: 68 },
    { key: "qual", ne: "गुण", en: "Qualities", width: 88 },
    { key: "aspect", ne: "दृष्टि", en: "Aspected by", width: 108 },
  ];

  return (
    <DataTable
      compact
      columns={columns}
      rows={rows.map((r) => ({
        key: String(r.house),
        highlight: r.house === 1,
        cells: [
          <Text key="h" className="text-caption font-num font-semibold text-foreground" style={nepaliTextStyle(11)}>
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
    { key: "name", ne: "उपग्रह", en: "Upagraha", width: 132 },
    { key: "rashi", ne: "राशि", en: "Rashi", width: 104 },
    { key: "dms", ne: "अंश", en: "Degree", width: 108 },
    { key: "nak", ne: "नक्षत्र / पद", en: "Nakshatra / Pada", width: 150 },
    { key: "lord", ne: "स्वामी", en: "Lord", width: 104 },
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
          <Text key="d" className="text-caption font-num text-foreground">
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
  auspicious: { ne: "शुभ", en: "Auspicious", tone: "#2e7d32" },
  inauspicious: { ne: "अशुभ", en: "Inauspicious", tone: "#c62828" },
  mixed: { ne: "मिश्रित", en: "Mixed", tone: "#d97706" },
  caution: { ne: "सावधानी", en: "Caution", tone: "#d97706" },
};

export function YogaList({ yogas }: { yogas: KundaliYoga[] }) {
  const { lang, pick } = useLocale();
  const present = yogas.filter((y) => y.present);

  if (!present.length) {
    return (
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
        {pick("यस कुण्डलीमा कुनै प्रमुख योग भेटिएन।", "No major yogas found in this chart.")}
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
              <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
                {lang === "en" ? y.nameEn : y.nameNe}
              </Text>
              <View
                style={{ backgroundColor: colorWithAlpha(nature.tone, 0.12) }}
                className="rounded-full px-2 py-0.5"
              >
                <Text
                  style={{ color: nature.tone, ...nepaliTextStyle(10) }}
                  className="text-caption font-bold"
                >
                  {pick(nature.ne, nature.en)}
                </Text>
              </View>
            </View>
            <Text
              className="text-body mt-1 leading-relaxed text-muted-foreground"
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
