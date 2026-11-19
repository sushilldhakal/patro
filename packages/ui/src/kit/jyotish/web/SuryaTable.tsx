import { useState } from "react";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { suryaTable } from "@vedic-patro/drawing/learn/surya-tables";
import { useLocale } from "@vedic-patro/i18n/react";
import type { SuryaTableProps } from "../contract";
import { MathSteps } from "./SuryaFigure";

const FIRST_ROWS = 12;

/** A Surya Siddhanta reference table: a table from the small breakpoint up, an accordion on a phone. */
export function SuryaTable({ tableKey }: SuryaTableProps) {
  const { lang, t, digits } = useLocale();
  const table = suryaTable(tableKey, lang === "en" ? "en" : "ne");
  const [all, setAll] = useState(false);
  const long = table.rows.length > FIRST_ROWS + 2;
  // keep the marked row in view when the table is cut short
  const cut = Math.max(FIRST_ROWS, (table.highlight ?? 0) + 3);
  const rows = long && !all ? table.rows.slice(0, cut) : table.rows;
  return (
    <section className={documentsClasses.table}>
      <h3 className={documentsClasses.figureTitle}>{table.title}</h3>
      {table.note ? <p className={documentsClasses.tableNote}>{table.note}</p> : null}

      <div className={`${documentsClasses.tableScroll} hidden sm:block`}>
        <table className={documentsClasses.tableGrid} style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th key={i} scope="col" className={documentsClasses.tableHead}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r === table.highlight ? documentsClasses.tableRowMark : undefined}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className={`${documentsClasses.tableCell} whitespace-nowrap text-left font-semibold`}>
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className={`${documentsClasses.tableCell} whitespace-nowrap`}>
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${documentsClasses.tableAccordion} flex flex-col sm:hidden`}>
        {rows.map((row, r) => {
          const marked = r === table.highlight;
          const titled = Boolean(table.numbered) && row.length > 2;
          const title = titled ? `${row[0]}. ${row[1]}` : row[0];
          const rest = row.map((cell, i) => ({ label: table.columns[i] ?? "", cell, i })).filter(({ i }) => i > (titled ? 1 : 0));
          return (
            <details key={r} open={marked} className={`${documentsClasses.tableItem} ${marked ? documentsClasses.tableItemMark : ""}`}>
              <summary className={`${documentsClasses.tableItemHead} flex cursor-pointer`}>
                <span className={documentsClasses.tableItemTitle}>{title}</span>
                <span className={documentsClasses.tableItemPeek}>{rest[0]?.cell}</span>
              </summary>
              <dl className={`${documentsClasses.tableItemBody} flex flex-col`} style={{ fontVariantNumeric: "tabular-nums" }}>
                {rest.map(({ label, cell, i }) => (
                  <div key={i} className={`${documentsClasses.tableItemRow} flex`}>
                    <dt className={documentsClasses.tableItemLabel}>{label}</dt>
                    <dd className={documentsClasses.tableItemValue}>{cell}</dd>
                  </div>
                ))}
              </dl>
            </details>
          );
        })}
      </div>

      {long ? (
        <button type="button" className={documentsClasses.tableMore} onClick={() => setAll((v) => !v)}>
          {all ? t("documents.table_show_less") : t("documents.table_show_all", { count: digits(table.rows.length) })}
        </button>
      ) : null}
      {table.steps?.length ? <MathSteps steps={table.steps} title={t("documents.figure_math")} /> : null}
    </section>
  );
}
