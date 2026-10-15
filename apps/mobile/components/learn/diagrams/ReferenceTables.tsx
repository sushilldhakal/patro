/**
 * The six panchanga reference tables — native port of web's
 * `PanchangaReferenceGuide.tsx`, reusing the same shared data modules
 * (`lib/wheel-data.ts`, `lib/tithi-wheel-data.ts`, `lib/nakshatra-icons.ts`,
 * `lib/wheel-locale.ts`) mobile already ports for its own wheel/kundali
 * screens. Registered in `lib/learn/learn-diagrams.tsx` as `table-*`.
 */
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LearnTable } from "@/components/learn/LearnTable";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { getWheelRashis, RASHI_LORDS, RASHI_ELEM, PADA_AKSHAR } from "@vedic-patro/domain/wheel-data";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { WHEEL_TITHIS, WHEEL_YOGAS, KAR_MOV, KAR_FIX_NAMES, KARANA_EN } from "@vedic-patro/domain/tithi-wheel-data";
import { NAK_LORD_EN, TATTVA_EN } from "@vedic-patro/domain/wheel-locale";
import { tFor } from "@vedic-patro/i18n/runtime";

const YOGA_EN = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
  "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];

const GRAHA_ROWS = [
  { get ne() { return tFor("ne", "kundali.report.meta_sun"); }, get en() { return tFor("en", "kundali.report.meta_sun"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_sun"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_sun"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_moon"); }, get en() { return tFor("en", "kundali.graha_name_moon"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_moon"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_moon"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_mars"); }, get en() { return tFor("en", "kundali.graha_name_mars"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_mars"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_mars"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_mercury"); }, get en() { return tFor("en", "kundali.graha_name_mercury"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_mercury"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_mercury"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_jupiter"); }, get en() { return tFor("en", "kundali.graha_name_jupiter"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_jupiter"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_jupiter"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_venus"); }, get en() { return tFor("en", "kundali.graha_name_venus"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_venus"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_venus"); } },
  { get ne() { return tFor("ne", "kundali.graha_name_saturn"); }, get en() { return tFor("en", "kundali.graha_name_saturn"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_saturn"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_saturn"); } },
  { get ne() { return tFor("ne", "grahas.rahu"); }, get en() { return tFor("en", "grahas.rahu"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_rahu"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_rahu"); } },
  { get ne() { return tFor("ne", "grahas.ketu"); }, get en() { return tFor("en", "grahas.ketu"); }, get meaningNe() { return tFor("ne", "learn.diagrams.graha_meaning_ketu"); }, get meaningEn() { return tFor("en", "learn.diagrams.graha_meaning_ketu"); } },
];

function TableCaption({ children }: { children: string }) {
  return (
    <Text className="text-caption font-semibold text-muted-foreground" style={nepaliTextStyle(11)}>
      {children}
    </Text>
  );
}

export function RashiReferenceTable() {
  const { t, pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{t("learn.12_rashis_each_30_360_total")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), t("panchanga.wheel.rashi"), "°", t("panchanga.wheel.lord"), t("panchanga.wheel_panel.element")]}
        rows={getWheelRashis().map((r, i) => [
          digits(i + 1),
          pick(r.ne, r.en),
          `${digits(i * 30)}°–${digits((i + 1) * 30)}°`,
          pick(RASHI_LORDS[i]!, NAK_LORD_EN[RASHI_LORDS[i]!] ?? RASHI_LORDS[i]!),
          pick(RASHI_ELEM[i]!, TATTVA_EN[RASHI_ELEM[i]!] ?? RASHI_ELEM[i]!),
        ])}
      />
    </View>
  );
}

export function GrahaReferenceTable() {
  const { t, pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{t("learn.nava_graha_9_used_in_panchanga_and_kundali")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), t("kundali.graha"), t("learn.brief_meaning")]}
        rows={GRAHA_ROWS.map((g, i) => [digits(i + 1), pick(g.ne, g.en), pick(g.meaningNe, g.meaningEn)])}
      />
    </View>
  );
}

/**
 * Rashi + nakshatra tables together — native port of web's
 * `ComputationReferenceTables` (used in the "how we calculate" chapter's
 * foundation section, right after the observer/civil-day/Julian-day keys).
 */
export function ComputationReferenceDiagram() {
  return (
    <View className="gap-6">
      <RashiReferenceTable />
      <NakshatraReferenceTable />
    </View>
  );
}

export function NakshatraReferenceTable() {
  const { t, pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>
        {t("learn.27_nakshatras_each_13_20_four_padas_3_20_per_pada")}
      </TableCaption>
      <LearnTable
        headers={[
          pick("#", "#"),
          t("nakshatra"),
          "°",
          t("panchanga.wheel.lord"),
          t("learn.symbol"),
          t("learn.pada_1"),
          t("learn.pada_2"),
          t("learn.pada_3"),
          t("learn.pada_4"),
        ]}
        rows={NAKSHATRA_ICONS.map((nak, i) => {
          const padas = PADA_AKSHAR[i]!;
          const startDeg = i * 13;
          return [
            digits(i + 1),
            pick(nak.ne, nak.en),
            `${digits(startDeg)}°${digits(20)}′–${digits(startDeg + 13)}°${digits(20)}′`,
            pick(nak.lord_ne, NAK_LORD_EN[nak.lord_ne] ?? nak.lord_ne),
            nak.sym_ne,
            ...padas,
          ];
        })}
      />
    </View>
  );
}

export function TithiReferenceTable() {
  const { t, pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{t("learn.30_tithis_the_12_angular_gap_between_moon_and_sun")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), t("tithi"), t("sections.paksha"), t("learn.angle")]}
        rows={WHEEL_TITHIS.map((row, i) => [
          digits(i + 1),
          pick(row.ne, row.en),
          pick(row.paksha, `${row.pakshaEn} Paksha`),
          `${digits(i * 12)}°–${digits((i + 1) * 12)}°`,
        ])}
      />
    </View>
  );
}

export function YogaReferenceTable() {
  const { t, pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{t("learn.27_yogas_sum_of_sun_moon_longitude_each_13_20")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), t("kundali.yoga"), pick("° (≈)", "° (≈)")]}
        rows={WHEEL_YOGAS.map((y, i) => [
          digits(i + 1),
          pick(y, YOGA_EN[i] ?? y),
          `${digits(i * 13)}°${digits(20)}′–${digits((i + 1) * 13)}°${digits(20)}′`,
        ])}
      />
    </View>
  );
}

export function KaranaReferenceTable() {
  const { t, pick, digits } = useLocale();
  const charRows = KAR_MOV.map((ne) => ({ ne, typeNe: tFor("ne", "learn.movable_7"), typeEn: tFor("en", "learn.movable_7") }));
  const sthiraRows = KAR_FIX_NAMES.slice(1).map((ne) => ({ ne, typeNe: tFor("ne", "learn.fixed_4"), typeEn: tFor("en", "learn.fixed_4") }));

  const rows: string[][] = [
    [
      digits(1),
      `${pick(tFor(undefined, "ui.learn.x_91824d34"), KARANA_EN[/* copy-ok */ "किंस्तुघ्न"] ?? "Kimstughna")}`,
      t("learn.fixed"),
      t("learn.first_half_of_shukla_pratipada_once_a_year"),
    ],
    ...charRows.map((k, i) => [
      digits(i + 2),
      `${pick(k.ne, KARANA_EN[k.ne] ?? k.ne)}${k.ne === /* copy-ok */ "विष्टि" ? t("learn.bhadra") : ""}`,
      pick(k.typeNe, k.typeEn),
      t("learn.repeats_throughout_the_month"),
    ]),
    ...sthiraRows.map((k, i) => [
      digits(i + 9),
      pick(k.ne, KARANA_EN[k.ne] ?? k.ne),
      pick(k.typeNe, k.typeEn),
      t("learn.once_each_per_month_krishna_chaturdashi_aaushi_shukla_p"),
    ]),
  ];

  return (
    <View className="gap-1.5">
      <TableCaption>{t("learn.11_karanas_half_a_tithi_6_angle_60_karanas_per_month")}</TableCaption>
      <LearnTable headers={[pick("#", "#"), t("kundali.karana"), t("holidays.col_type"), t("learn.note")]} rows={rows} />
      <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
        {t("learn.order_kimstughna_bava_vishti_8_shakuni_chatushpada_naga")}
      </Text>
    </View>
  );
}
