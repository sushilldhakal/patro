import { useState } from "react";
import { Pressable, View } from "react-native";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { suryaTable } from "@vedic-patro/drawing/learn/surya-tables";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import type { SuryaTableProps } from "../contract";
import { MathSteps } from "./SuryaFigure";

const FIRST_ROWS = 12;

function Item({ title, peek, rest, marked }: { title: string; peek?: string; rest: { label: string; cell: string }[]; marked: boolean }) {
  const [open, setOpen] = useState(marked);
  return (
    <View className={`${documentsClasses.tableItem} ${marked ? documentsClasses.tableItemMark : ""}`}>
      <Pressable className={documentsClasses.tableItemHead} onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text className={documentsClasses.tableItemTitle}>{title}</Text>
        {peek ? <Text className={documentsClasses.tableItemPeek}>{peek}</Text> : null}
        <Text className={documentsClasses.tableItemPeek}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open ? (
        <View className={documentsClasses.tableItemBody}>
          {rest.map((r, i) => (
            <View key={i} className={documentsClasses.tableItemRow}>
              <Text className={documentsClasses.tableItemLabel}>{r.label}</Text>
              <Text className={documentsClasses.tableItemValue}>{r.cell}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The website's Surya Siddhanta table as an accordion: one row per line, its columns inside. */
export function SuryaTable({ tableKey }: SuryaTableProps) {
  const { lang, t, digits } = useLocale();
  const table = suryaTable(tableKey, lang === "en" ? "en" : "ne");
  const [all, setAll] = useState(false);
  const long = table.rows.length > FIRST_ROWS + 2;
  const cut = Math.max(FIRST_ROWS, (table.highlight ?? 0) + 3);
  const rows = long && !all ? table.rows.slice(0, cut) : table.rows;
  return (
    <View className={documentsClasses.table}>
      <Text className={documentsClasses.figureTitle}>{table.title}</Text>
      {table.note ? <Text className={documentsClasses.tableNote}>{table.note}</Text> : null}
      <View className={documentsClasses.tableAccordion}>
        {rows.map((row, r) => {
          const titled = Boolean(table.numbered) && row.length > 2;
          const title = titled ? `${row[0]}. ${row[1]}` : (row[0] ?? "");
          const rest = row.map((cell, i) => ({ label: table.columns[i] ?? "", cell, i })).filter(({ i }) => i > (titled ? 1 : 0));
          return <Item key={r} title={title} peek={rest[0]?.cell} rest={rest} marked={r === table.highlight} />;
        })}
      </View>
      {long ? (
        <Pressable className={documentsClasses.tableMore} onPress={() => setAll((v) => !v)} accessibilityRole="button">
          <Text className="text-sm font-medium text-foreground">{all ? t("documents.table_show_less") : t("documents.table_show_all", { count: digits(table.rows.length) })}</Text>
        </Pressable>
      ) : null}
      {table.steps?.length ? <MathSteps steps={table.steps} title={t("documents.figure_math")} /> : null}
    </View>
  );
}
