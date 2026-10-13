import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaInlineChildren } from "@/components/kundali/KundaliGlyphLabels";
import {
  DataTable,
  TableHeaderLabel,
  type TableColumn,
} from "@/components/ui/DataTable";
import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const PLANET_ORDER = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;

const GRADE_LABEL: Record<VimshopakaGrade, { ne: string; en: string }> = {
  full: { ne: "पूर्ण", en: "Full" },
  mediocre: { ne: "मध्यम", en: "Mediocre" },
  little: { ne: "अल्प", en: "Little" },
  incapable: { ne: "असमर्थ", en: "Incapable" },
};

const GRADE_RANGE: Record<VimshopakaGrade, string> = {
  full: "15–20",
  mediocre: "10–15",
  little: "5–10",
  incapable: "<5",
};

const v = kundaliDetailClasses.vimshopaka;

const GRADE_CLASSES: Record<VimshopakaGrade, { bg: string; text: string }> = {
  full: { bg: v.gradeFullBg, text: v.gradeFullText },
  mediocre: { bg: v.gradeMediocreBg, text: v.gradeMediocreText },
  little: { bg: v.gradeLittleBg, text: v.gradeLittleText },
  incapable: { bg: v.gradeIncapableBg, text: v.gradeIncapableText },
};

function ScoreBadge({
  score,
  grade,
  digits,
  lang,
}: {
  score: number;
  grade: VimshopakaGrade;
  digits: (v: string | number) => string;
  lang: "ne" | "en";
}) {
  const gradeClasses = GRADE_CLASSES[grade];
  const gradeName = lang === "en" ? GRADE_LABEL[grade].en : GRADE_LABEL[grade].ne;

  return (
    <View
      accessibilityLabel={`${gradeName}, ${digits(score.toFixed(2))}`}
      style={{ minWidth: 52 }}
      className={cn(v.badge, gradeClasses.bg)}
    >
      <Text className={cn(v.badgeText, "font-mono", gradeClasses.text)} style={nepaliTextStyle(13)}>
        {digits(score.toFixed(2))}
      </Text>
    </View>
  );
}

function GradeLegend({ lang }: { lang: "ne" | "en" }) {
  const grades: VimshopakaGrade[] = ["full", "mediocre", "little", "incapable"];

  return (
    <View className={v.legend}>
      {grades.map((g) => {
        const label = lang === "en" ? GRADE_LABEL[g].en : GRADE_LABEL[g].ne;
        return (
          <View key={g} className={v.legendItem}>
            <View className={cn(v.legendDot, GRADE_CLASSES[g].bg)} />
            <Text className={v.legendText} style={nepaliTextStyle(13)}>
              {label}
            </Text>
            <Text className={v.legendRange} style={nepaliTextStyle(11)}>
              {GRADE_RANGE[g]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function VimshopakaCard({
  data,
  compactHeader = false,
}: {
  data: VimshopakaData;
  compactHeader?: boolean;
}) {
  const { lang, pick, digits } = useLocale();
  const classes = data.classifications;

  const rows = PLANET_ORDER.map((key) => data.planets.find((p) => p.key === key)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  const classColWidth = 88;
  const columns: TableColumn[] = [
    { key: "graha", ne: "ग्रह", en: "Graha", width: 128 },
    ...classes.map((c) => ({
      key: c.key,
      ne: c.label_ne,
      en: c.label,
      width: classColWidth,
      header: (
        <View className="w-full items-center">
          <TableHeaderLabel compact={false} uppercase={false} numberOfLines={3}>
            {pick(c.label_ne, c.label)}
          </TableHeaderLabel>
        </View>
      ),
    })),
  ];

  const introNe = `वर्गीय बल — २० अंकको मापन (${digits(data.max_score)} पूर्ण)। ग्रहले आफ्ना फल दिने क्षमता।`;
  const introEn = `Divisional strength on a 20-point scale (${data.max_score} = full) — a planet's capacity to deliver its results.`;

  return (
    <View className={v.root}>
      {!compactHeader ? (
        <Text className={v.title} style={nepaliTextStyle(16)}>
          {kundaliLabel("vimshopaka_bala", lang)}
        </Text>
      ) : null}
      <View className="px-4">
        <Text className={v.intro} style={nepaliTextStyle(14)}>
          {pick(introNe, introEn)}
        </Text>
      </View>

      <DataTable
        stretch
        columns={columns}
        rows={rows.map((p) => {
          const graha = GRAHA_NAME[p.key as GrahaKey];
          const name = graha ? (lang === "en" ? graha.en : graha.ne) : pick(p.name_ne, p.name);

          return {
            key: p.key,
            cells: [
              <GrahaInlineChildren key="g" grahaKey={p.key} size={22}>
                <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)} numberOfLines={1}>
                  {name}
                </Text>
              </GrahaInlineChildren>,
              ...classes.map((c) => {
                const s = p.scores[c.key];
                if (!s) {
                  return (
                    <Text key={c.key} className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
                      —
                    </Text>
                  );
                }
                return (
                  <View key={c.key} className="w-full items-center">
                    <ScoreBadge score={s.score} grade={s.grade} digits={digits} lang={lang} />
                  </View>
                );
              }),
            ],
          };
        })}
      />

      <View className="px-4 pb-1">
        <GradeLegend lang={lang} />
      </View>
    </View>
  );
}
