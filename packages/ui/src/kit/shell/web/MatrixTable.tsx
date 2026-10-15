import { cn } from "@vedic-patro/domain/utils";
import type { MatrixTableProps } from "../contract";

/** A table whose header cells can span columns. The website draws a real table. */
export function MatrixTable({ label, headerRows, rows, className, tableClassName }: MatrixTableProps) {
  return (
    <div className={cn("max-w-full overflow-x-auto", className)}>
      <table className={cn("w-full border-collapse", tableClassName)} aria-label={label}>
        <thead>
          {headerRows.map((row) => (
            <tr key={row.key} className={row.className}>
              {row.cells.map((cell) => (
                <th key={cell.key} colSpan={cell.colSpan} scope={cell.scope ?? "col"} title={cell.title} className={cell.className}>
                  {cell.children}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.className}>
              {row.cells.map((cell) =>
                cell.scope === "row" ? (
                  <th key={cell.key} scope="row" colSpan={cell.colSpan} title={cell.title} className={cell.className}>
                    {cell.children}
                  </th>
                ) : (
                  <td key={cell.key} colSpan={cell.colSpan} title={cell.title} className={cell.className}>
                    {cell.children}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
