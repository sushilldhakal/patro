import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaInlineChildren } from "@/components/kundali/KundaliGlyphLabels";
import {
  DataTable,
  TableHeaderLabel,
  type TableColumn,
} from "@/components/ui/DataTable";
import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

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

/** Match web VimshopakaCard badge colors (emerald / sky / amber / destructive). */
function gradeColors(grade: VimshopakaGrade, dark: boolean): { bg: string; fg: string } {
  switch (grade) {
    case "full":
      return { bg: colorWithAlpha(dark ? "#34d399" : "#10b981", 0.15), fg: dark ? "#34d399" : "#059669" };
    case "mediocre":
      return { bg: colorWithAlpha(dark ? "#38bdf8" : "#0ea5e9", 0.15), fg: dark ? "#38bdf8" : "#0284c7" };
    case "little":
      return { bg: colorWithAlpha(dark ? "#fbbf24" : "#f59e0b", 0.15), fg: dark ? "#fbbf24" : "#d97706" };
    case "incapable":
      return { bg: colorWithAlpha(dark ? "#f87171" : "#ef4444", 0.15), fg: dark ? "#f87171" : "#dc2626" };
  }
}

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
  const { isDark } = useTheme();
  const colors = gradeColors(grade, isDark);
  const gradeName = lang === "en" ? GRADE_LABEL[grade].en : GRADE_LABEL[grade].ne;

  return (
    <View
      accessibilityLabel={`${gradeName}, ${digits(score.toFixed(2))}`}
      style={{ backgroundColor: colors.bg, minWidth: 52 }}
      className="items-center justify-center rounded-md px-2 py-1"
    >
      <Text className="font-num font-semibold tabular-nums" style={[nepaliTextStyle(13), { color: colors.fg }]}>
        {digits(score.toFixed(2))}
      </Text>
    </View>
  );
}

function GradeLegend({ lang }: { lang: "ne" | "en" }) {
  const { isDark } = useTheme();
  const grades: VimshopakaGrade[] = ["full", "mediocre", "little", "incapable"];

  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-2">
      {grades.map((g) => {
        const colors = gradeColors(g, isDark);
        const label = lang === "en" ? GRADE_LABEL[g].en : GRADE_LABEL[g].ne;
        return (
          <View key={g} className="flex-row items-center gap-1.5">
            <View style={{ backgroundColor: colors.bg }} className="h-2.5 w-2.5 rounded-sm" />
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
              {label}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
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
    <View className="gap-3">
      {!compactHeader ? (
        <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
          {kundaliLabel("vimshopaka_bala", lang)}
        </Text>
      ) : null}
      <View className="px-4">
        <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
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
