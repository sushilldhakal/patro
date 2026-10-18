import type { ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kitIcons, tableClass } from "../classes";
import type { TableColumn, TableProps } from "../contract";
import { Icon } from "./Icon";

function SortArrow({ sorted }: { sorted: TableColumn["sorted"] }) {
  if (sorted === "asc") return <Icon node={kitIcons.chevronUp} size="xs" />;
  if (sorted === "desc") return <Icon node={kitIcons.chevronDown} size="xs" />;
  return <Icon node={kitIcons.chevronsUpDown} size="xs" className="opacity-40" />;
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  renderCell,
  empty,
  classes = {},
  className,
  webClassName,
  testID,
}: TableProps<Row>): ReactNode {
  const c = { ...tableClass, ...classes };
  return (
    <div className={cn("overflow-x-auto", c.root, className, webClassName)} data-testid={testID}>
      <table className="w-full text-sm">
        <thead className={c.head}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={col.sorted === "asc" ? "ascending" : col.sorted === "desc" ? "descending" : undefined}
                className={cn("text-left whitespace-nowrap", c.headCell, c.headText, col.onPress && "cursor-pointer select-none hover:text-foreground")}
                onClick={col.onPress}
              >
                {col.onPress ? (
                  <span className="flex items-center gap-1">
                    {col.header}
                    <SortArrow sorted={col.sorted} />
                  </span>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={cn(c.emptyCell, c.emptyText)}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className={cn(c.row, "transition-colors hover:bg-muted/30")}>
                {columns.map((col) => (
                  <td key={col.key} className={c.cell}>
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
