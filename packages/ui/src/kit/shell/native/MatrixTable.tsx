import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Text } from "@vedic-patro/ui";
import type { MatrixTableProps } from "../contract";

/** The type and colour utilities in a cell's classes, which a View cannot use. */
const TEXT_CLASS = /^(?:dark:)?(?:text-|font-|leading-|tracking-|opacity-)/;

function textClasses(className: string | undefined): string {
  return (className ?? "").split(/\s+/).filter((c) => TEXT_CLASS.test(c)).join(" ");
}

/**
 * The same matrix. A cell's `colSpan` is its flex share of the row. A cell
 * given a plain string or number is drawn in a Text with the cell's type
 * classes: React Native draws nothing for a bare string inside a View, so the
 * sun-times day numbers and times were blank.
 */
export function MatrixTable({ label, headerRows, rows, className, tableClassName }: MatrixTableProps) {
  const line = (row: MatrixTableProps["rows"][number]) => (
    <View key={row.key} className={cn("flex-row items-center", row.className)}>
      {row.cells.map((cell) => (
        <View
          key={cell.key}
          accessibilityLabel={cell.title}
          className={cell.className}
          style={cell.colSpan && cell.colSpan > 1 ? { flex: cell.colSpan } : undefined}
        >
          {typeof cell.children === "string" || typeof cell.children === "number" ? (
            <Text className={cn(textClasses(tableClassName), textClasses(cell.className))}>{String(cell.children)}</Text>
          ) : (
            cell.children
          )}
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
