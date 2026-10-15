import { useLocale } from "@vedic-patro/i18n/react";
import { Table, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
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
    <div>
      <Text as="p" className={learnRefCaption}>{table.caption}</Text>
      <Table
        className={learnRefWrap}
        columns={table.columns}
        rows={table.rows}
        rowKey={(row) => row.key}
        classes={{ headCell: learnRefHeadCell, headText: "", cell: learnRefCell, row: "" }}
        renderCell={(row, column) => {
          const cell = row.cells[column.key];
          return (
            <span className={cn(cell?.tone && toneClass[cell.tone], row.highlight && learnRefHighlightCell)}>
              {cell?.text}
            </span>
          );
        }}
      />
      {table.note ? <p className={cn(tmCardCap, learnRefNote)}>{table.note}</p> : null}
    </div>
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
