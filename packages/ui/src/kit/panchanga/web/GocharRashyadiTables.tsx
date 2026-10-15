import type { RashyadiSegment } from "@vedic-patro/domain/dainikKranti/rashyadi";
import { useGocharRashyadiTable, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type TableProps = {
  segment: RashyadiSegment;
  kundaliGrahas?: GocharGrahaRow[];
  kundaliDateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** Accepted so the app and the website share one props contract. The website always shows the version line. */
  hideVersionHeader?: boolean;
};

export function GocharRashyadiTable({
  segment,
  kundaliGrahas,
  kundaliDateAd,
  loading,
  className,
  hideVersionHeader,
}: TableProps) {
  const table = useGocharRashyadiTable({ segment, kundaliGrahas, kundaliDateAd });

  if (loading) {
    return (
      <Box className={cn(dainikKrantiClasses.rashyadiLoading, "flex h-full min-h-[280px]", className)}>
        <Text as="p" className="text-sm">
          {table.loadingText}
        </Text>
      </Box>
    );
  }

  return (
    <Box className={cn(dainikKrantiClasses.rashyadiCard, "h-full overflow-x-auto", className)}>
      <Box className={dainikKrantiClasses.rashyadiHead}>
        {hideVersionHeader ? null : <Text as="p" className={dainikKrantiClasses.rashyadiVersion}>{table.version}</Text>}
        <Text as="p" className={dainikKrantiClasses.rashyadiLabel}>
          {table.label}
          {table.day ? <Text as="span" className={dainikKrantiClasses.rashyadiDay}>{table.day}</Text> : null}
        </Text>
        {table.moon ? (
          <Text as="p" className={dainikKrantiClasses.rashyadiMoon}>
            {table.moon.label} <Text as="span" className={dainikKrantiClasses.rashyadiMoonValue}>{table.moon.value}</Text>
          </Text>
        ) : null}
      </Box>

      <table className="w-full flex-1 border-collapse text-sm">
        <thead>
          <tr className={dainikKrantiClasses.rashyadiHeadRow}>
            <th className="w-10 px-1 py-2" />
            {table.columns.map((col) => (
              <th key={col.key} className={cn(dainikKrantiClasses.rashyadiTh, "min-w-[2.25rem]")}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={dainikKrantiClasses.rashyadiRow}>
            <td className={dainikKrantiClasses.rashyadiTdPaksha}>{table.pakshaDays}</td>
            {table.columns.map((col) => (
              <td key={`hdr-${col.key}`} className="px-1 py-2" />
            ))}
          </tr>
          {table.rows.map((row) => (
            <tr key={row.key} className={cn(dainikKrantiClasses.rashyadiRow, "last:border-0")}>
              <td className={cn(dainikKrantiClasses.rashyadiTdLabel, "whitespace-nowrap")}>{row.label}</td>
              {row.cells.map((cell) => (
                <td key={cell.key} className={dainikKrantiClasses.rashyadiTdValue}>
                  {cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Text as="p" className={dainikKrantiClasses.rashyadiFoot}>
        {table.footnote}
      </Text>
    </Box>
  );
}
