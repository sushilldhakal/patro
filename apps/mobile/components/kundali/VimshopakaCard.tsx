import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaInlineChildren } from "@/components/kundali/KundaliGlyphLabels";
import {
  DataTable,
  TableHeaderLabel,
  type TableColumn,
} from "@/components/ui/DataTable";
import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { useVimshopakaCard } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Card = ReturnType<typeof useVimshopakaCard>;

const v = kundaliDetailClasses.vimshopaka;

const GRADE_CLASSES: Record<VimshopakaGrade, { bg: string; text: string }> = {
  full: { bg: v.gradeFullBg, text: v.gradeFullText },
  mediocre: { bg: v.gradeMediocreBg, text: v.gradeMediocreText },
  little: { bg: v.gradeLittleBg, text: v.gradeLittleText },
  incapable: { bg: v.gradeIncapableBg, text: v.gradeIncapableText },
};

function ScoreBadge({ score, grade, gradeLabel }: { score: string; grade: VimshopakaGrade; gradeLabel: string }) {
  const gradeClasses = GRADE_CLASSES[grade];

  return (
    <View accessibilityLabel={`${gradeLabel}, ${score}`} style={{ minWidth: 52 }} className={cn(v.badge, gradeClasses.bg)}>
      <Text className={cn(v.badgeText, "font-mono", gradeClasses.text)} style={nepaliTextStyle(13)}>
        {score}
      </Text>
    </View>
  );
}

function GradeLegend({ legend }: { legend: Card["legend"] }) {
  return (
    <View className={v.legend}>
      {legend.map((g) => (
        <View key={g.grade} className={v.legendItem}>
          <View className={cn(v.legendDot, GRADE_CLASSES[g.grade].bg)} />
          <Text className={v.legendText} style={nepaliTextStyle(13)}>
            {g.label}
          </Text>
          <Text className={v.legendRange} style={nepaliTextStyle(11)}>
            {g.range}
          </Text>
        </View>
      ))}
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
  const card = useVimshopakaCard(data);

  const classColWidth = 88;
  const columns: TableColumn[] = [
    { key: "graha", ne: card.grahaHeader, en: card.grahaHeader, width: 128 },
    ...card.columns.map((c) => ({
      key: c.key,
      ne: c.label,
      en: c.label,
      width: classColWidth,
      header: (
        <View className="w-full items-center">
          <TableHeaderLabel compact={false} uppercase={false} numberOfLines={3}>
            {c.label}
          </TableHeaderLabel>
        </View>
      ),
    })),
  ];

  return (
    <View className={v.root}>
      {!compactHeader ? (
        <Text className={v.title} style={nepaliTextStyle(16)}>
          {card.title}
        </Text>
      ) : null}
      <View className="px-4">
        <Text className={v.intro} style={nepaliTextStyle(14)}>
          {card.intro}
        </Text>
      </View>

      <DataTable
        stretch
        columns={columns}
        rows={card.rows.map((p) => ({
          key: p.key,
          cells: [
            <GrahaInlineChildren key="g" grahaKey={p.key} size={22}>
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)} numberOfLines={1}>
                {p.name}
              </Text>
            </GrahaInlineChildren>,
            ...p.cells.map((s) =>
              s.score == null ? (
                <Text key={s.key} className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
                  —
                </Text>
              ) : (
                <View key={s.key} className="w-full items-center">
                  <ScoreBadge score={s.score} grade={s.grade} gradeLabel={s.gradeLabel} />
                </View>
              ),
            ),
          ],
        }))}
      />

      <View className="px-4 pb-1">
        <GradeLegend legend={card.legend} />
      </View>
    </View>
  );
}
