import { View } from "react-native";
import { useLocale } from "@vedic-patro/i18n/react";
import { Table, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { bilingualText } from "@vedic-patro/domain/locale";
import { learnReferenceTable, type LearnRefKind, type LearnRefTone } from "@vedic-patro/domain/learn/reference-tables";
import { patroMono } from "@vedic-patro/design-tokens/classes/patro-classes";
import {
  learnRefCaption,
  learnRefCell,
  learnRefDeg,
  learnRefHeadCell,
  learnRefHighlightCell,
  learnRefNote,
  learnRefPada,
  learnRefSymNe,
  learnRefWrap,
  tmCardCap,
} from "@vedic-patro/design-tokens/classes/learn-classes";

const toneClass: Record<LearnRefTone, string> = {
  num: patroMono,
  deg: cn(patroMono, learnRefDeg),
  pada: learnRefPada,
  sym: learnRefSymNe,
};

function LearnReferenceTable({ kind }: { kind: LearnRefKind }) {
  const { t, lang, digits } = useLocale();
  const table = learnReferenceTable(kind, {
    t,
    digits,
    pick: (ne, en) => bilingualText(lang, ne, en),
  });
  return (
    <View>
      <Text className={learnRefCaption}>{table.caption}</Text>
      <Table
        className={learnRefWrap}
        columns={table.columns}
        rows={table.rows}
        rowKey={(row) => row.key}
        classes={{ headCell: learnRefHeadCell, headText: "", cell: learnRefCell, row: "" }}
        renderCell={(row, column) => {
          const cell = row.cells[column.key];
          return (
            <Text className={cn("text-sm", cell?.tone && toneClass[cell.tone], row.highlight && learnRefHighlightCell)}>
              {cell?.text}
            </Text>
          );
        }}
      />
      {table.note ? <Text className={cn("text-sm", tmCardCap, learnRefNote)}>{table.note}</Text> : null}
    </View>
  );
}

export function RashiReferenceTable() {
  return <LearnReferenceTable kind="rashi" />;
}
export function GrahaReferenceTable() {
  return <LearnReferenceTable kind="graha" />;
}
export function NakshatraReferenceTable() {
  return <LearnReferenceTable kind="nakshatra" />;
}
export function TithiReferenceTable() {
  return <LearnReferenceTable kind="tithi" />;
}
export function YogaReferenceTable() {
  return <LearnReferenceTable kind="yoga" />;
}
export function KaranaReferenceTable() {
  return <LearnReferenceTable kind="karana" />;
}
