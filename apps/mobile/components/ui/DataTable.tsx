import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import {
  tableHeaderCellPadding,
  tableHeaderTextStyle,
  nepaliTextStyle,
} from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { tableHeaderBackground, tableRowBackground } from "@/lib/theme";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

export type TableColumn = {
  key: string;
  ne: string;
  en: string;
  width: number;
  /** Optional custom header (e.g. graha icon + label). */
  header?: ReactNode;
};

/** @deprecated use TableColumn */
export type Column = TableColumn;

function columnFlexStyle(
  stretch: boolean,
  width: number,
): { width: number } | { flex: number; minWidth: number } {
  if (!stretch) return { width };
  return { flex: width, minWidth: Math.round(width * 0.72) };
}

/** Shared column sizing for composable tables (Shadbala matrix, etc.). */
export function tableColumnLayout(
  stretch: boolean,
  width: number,
): { width: number } | { flex: number; minWidth: number } {
  return columnFlexStyle(stretch, width);
}

/** Stretch column with explicit minWidth — pair header `TableHeaderCell` and body `TableCell` with the same values. */
export function tableFlexColumn(flex: number, minWidth: number) {
  return { flex, minWidth };
}

function useTableLayout(stretch?: boolean) {
  const { width: windowWidth } = useBreakpoint();
  /** Explicit `stretch: true` always fills the wrapper; `false` fixed+scroll; default fills from sm breakpoint up. */
  const fill = stretch === true ? true : stretch === false ? false : windowWidth >= 640;
  return { fill };
}

const TableLayoutContext = createContext({ fill: false });

export function useTableFillLayout() {
  return useContext(TableLayoutContext);
}

function resolveWidthLayout(
  fill: boolean,
  width: number | undefined,
  flex: number | undefined,
  minWidth: number | undefined,
) {
  if (width != null) return tableColumnLayout(fill, width);
  if (flex != null) return { flex, minWidth: minWidth ?? 0 };
  if (minWidth != null) return { minWidth };
  return undefined;
}

/** Standard header label — use inside `TableHeaderCell` or DataTable default headers. */
export function TableHeaderLabel({
  children,
  numberOfLines = 2,
  uppercase = true,
  className,
}: {
  children: ReactNode;
  /** @deprecated Size is text-caption. Kept so existing callers still type-check. */
  compact?: boolean;
  /** @deprecated Size is text-caption. */
  fontSize?: number;
  numberOfLines?: number;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={tableHeaderTextStyle()}
      className={cn(
        "text-caption font-semibold text-muted-foreground",
        uppercase ? "uppercase tracking-wide" : "tracking-normal",
        className,
      )}
    >
      {children}
    </Text>
  );
}

/** A column that never shrinks below `width`, and shares any spare room in proportion to it. */
function growColumn(width: number) {
  return { flexGrow: width, flexShrink: 0, flexBasis: width };
}

function headerCellStyle(
  layout:
    | { width: number }
    | { flex: number; minWidth: number }
    | { minWidth: number }
    | { flexGrow: number; flexShrink: number; flexBasis: number }
    | undefined,
  compact?: boolean,
) {
  const pad = tableHeaderCellPadding(compact);
  return [
    layout,
    {
      paddingHorizontal: pad.horizontal,
      paddingTop: pad.top,
      paddingBottom: pad.bottom,
      justifyContent: "flex-start" as const,
    },
  ];
}

/* ── Declarative column/row table (kundali, ashtakavarga, etc.) ───────── */

export function DataTable({
  columns,
  rows,
  compact = false,
}: {
  columns: TableColumn[];
  rows: { key: string; cells: React.ReactNode[]; highlight?: boolean }[];
  compact?: boolean;
  /** @deprecated Columns never squash any more: they keep their width and the table scrolls sideways. */
  stretch?: boolean;
}) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [viewportWidth, setViewportWidth] = useState(0);
  const cellPx = compact ? 6 : 10;
  const cellPy = compact ? 5 : 8;
  const bodySize = compact ? 12 : 13;
  /* Every column keeps at least its declared width, so no cell is squeezed into
     an ellipsis. A table wider than its container scrolls sideways; a narrower
     one is stretched to fill it, spare room shared in proportion to width. */
  const neededWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const tableWidth = Math.max(neededWidth, viewportWidth);

  const tableInner = (
    <View style={{ width: tableWidth }}>
      <View
        className="flex-row border-b border-border"
        style={{ backgroundColor: tableHeaderBackground(colors, isDark) }}
      >
        {columns.map((c) => (
          <View
            key={c.key}
            style={[
              ...headerCellStyle(growColumn(c.width), compact),
              { alignItems: "flex-start" as const },
            ]}
          >
            {c.header ?? (
              <TableHeaderLabel compact={compact} numberOfLines={2} uppercase={!compact}>
                {pick(c.ne, c.en)}
              </TableHeaderLabel>
            )}
          </View>
        ))}
      </View>
      {rows.map((r, i) => (
        <TableRow key={r.key} rowIndex={i} highlight={r.highlight}>
          {r.cells.map((cell, ci) => (
            <View
              key={ci}
              style={{
                ...growColumn(columns[ci]?.width ?? 90),
                paddingHorizontal: cellPx,
                paddingVertical: cellPy,
                justifyContent: "center",
              }}
            >
              {typeof cell === "string" || typeof cell === "number" ? (
                <Text className="text-foreground" style={nepaliTextStyle(bodySize)}>
                  {cell}
                </Text>
              ) : (
                cell
              )}
            </View>
          ))}
        </TableRow>
      ))}
    </View>
  );

  return (
    <View
      className="w-full overflow-hidden rounded-xl border border-border bg-card"
      onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        {tableInner}
      </ScrollView>
    </View>
  );
}

/* ── Composable primitives (custom cells, sortable headers, pressable rows) ─ */

export function TableScrollShell({
  children,
  scroll = true,
  stretch,
  bordered = true,
  rounded = true,
  className,
}: {
  children: ReactNode;
  scroll?: boolean;
  stretch?: boolean;
  bordered?: boolean;
  rounded?: boolean;
  className?: string;
}) {
  const { fill } = useTableLayout(stretch);
  const inner = <View className={fill ? "w-full" : undefined}>{children}</View>;

  return (
    <TableLayoutContext.Provider value={{ fill }}>
      <View
        className={cn(
          "w-full bg-card",
          bordered && "border border-border",
          rounded && "overflow-hidden rounded-xl",
          className,
        )}
      >
        {fill || !scroll ? inner : <ScrollView horizontal showsHorizontalScrollIndicator>{inner}</ScrollView>}
      </View>
    </TableLayoutContext.Provider>
  );
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  return (
    <View
      className={cn("w-full flex-row border-b border-border", className)}
      style={{ backgroundColor: tableHeaderBackground(colors, isDark) }}
    >
      {children}
    </View>
  );
}

export function TableColumnsHeader({
  columns,
  compact,
  className,
}: {
  columns: readonly TableColumn[];
  compact?: boolean;
  className?: string;
}) {
  const { pick } = useLocale();
  return (
    <TableHeader className={className}>
      {columns.map((c) => (
        <TableHeaderCell key={c.key} width={c.width} compact={compact}>
          <TableHeaderLabel compact={compact}>{pick(c.ne, c.en)}</TableHeaderLabel>
        </TableHeaderCell>
      ))}
    </TableHeader>
  );
}

export function TableHeaderCell({
  width,
  flex,
  minWidth,
  children,
  onPress,
  disabled,
  className,
  compact,
}: {
  width?: number;
  flex?: number;
  minWidth?: number;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { fill } = useTableFillLayout();
  const layout = resolveWidthLayout(fill, width, flex, minWidth);

  const cellStyle = headerCellStyle(layout, compact);

  if (onPress) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={cellStyle}
        className={cn("flex-row items-start gap-1 active:opacity-70", className)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cellStyle} className={cn("items-start", className)}>
      {children}
    </View>
  );
}

export function TableRow({
  rowIndex,
  highlight,
  onPress,
  children,
  className,
  borderTop = true,
  accessibilityLabel,
  accessibilityState,
}: {
  rowIndex: number;
  highlight?: boolean;
  onPress?: () => void;
  children: ReactNode;
  className?: string;
  /** @default true — first body row still uses border-t to separate from header */
  borderTop?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: { expanded?: boolean; selected?: boolean; disabled?: boolean };
}) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const style = { backgroundColor: tableRowBackground(colors, isDark, rowIndex, highlight) };
  const rowClass = cn("w-full flex-row", borderTop && "border-t border-border", className);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={style}
        className={cn(rowClass, "active:opacity-80")}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={style} className={rowClass}>
      {children}
    </View>
  );
}

export function TableCell({
  width,
  flex,
  minWidth,
  children,
  className,
  compact,
  align = "left",
}: {
  width?: number;
  flex?: number;
  minWidth?: number;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
}) {
  const { fill } = useTableFillLayout();
  const px = compact ? 6 : 10;
  const py = compact ? 5 : 8;
  const layout = resolveWidthLayout(fill, width, flex, minWidth);

  const alignClass =
    align === "center" ? "items-center" : align === "right" ? "items-end" : "items-start";

  return (
    <View
      style={[layout, { paddingHorizontal: px, paddingVertical: py }]}
      className={cn("justify-center", alignClass, className)}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text className="text-body text-foreground" style={nepaliTextStyle(13)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
