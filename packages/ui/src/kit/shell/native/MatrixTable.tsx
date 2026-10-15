import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { Box } from "@vedic-patro/ui";
import type { MatrixTableProps } from "../contract";

/** The same matrix. A cell's `colSpan` is its flex share of the row. */
export function MatrixTable({ label, headerRows, rows, className, tableClassName }: MatrixTableProps) {
  const line = (row: MatrixTableProps["rows"][number]) => (
    <View key={row.key} className={cn("flex-row", row.className)}>
      {row.cells.map((cell) => (
        <View
          key={cell.key}
          accessibilityLabel={cell.title}
          className={cell.className}
          style={cell.colSpan && cell.colSpan > 1 ? { flex: cell.colSpan } : undefined}
        >
          {cell.children}
        </View>
      ))}
    </View>
  );
  return (
    <Box label={label} className={cn("max-w-full", tableClassName, className)}>
      {headerRows.map(line)}
      {rows.map(line)}
    </Box>
  );
}
