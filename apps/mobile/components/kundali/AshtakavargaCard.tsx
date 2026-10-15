import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import {
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
  tableFlexColumn,
} from "@/components/ui/DataTable";
import type { AshtakavargaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useAshtakavargaCard } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Card = ReturnType<typeof useAshtakavargaCard>;

const TABLE_STRETCH = true;
/** Same flex + minWidth on headers and cells so columns stay aligned while filling screen width. */
const RASHI_COL = tableFlexColumn(160, 112);
const GRAHA_COL = tableFlexColumn(72, 52);
const SARV_COL = tableFlexColumn(64, 48);
const CELL_FONT = 14;
const HEADER_FONT = 12;
const RASHI_ICON = 26;
const RASHI_FONT = 13;
const GRAHA_ICON = 22;

function AshtakavargaTargetHead({ target }: { target: Card["targets"][number] }) {
  if (target.graha) {
    return (
      <View className="items-end gap-1">
        <GrahaPlanetIcon graha={target.key as GrahaKey} size={GRAHA_ICON} />
        <TableHeaderLabel fontSize={HEADER_FONT} uppercase={false} numberOfLines={2}>
          {target.label}
        </TableHeaderLabel>
      </View>
    );
  }
  return (
    <View className="items-end">
      <TableHeaderLabel fontSize={HEADER_FONT} uppercase={false} numberOfLines={2}>
        {target.label}
      </TableHeaderLabel>
    </View>
  );
}

const av = kundaliDetailClasses.ashtakavarga;

function numCell(value: string, bold?: boolean) {
  return (
    <View className="items-end justify-center">
      <Text
        className={cn(av.num, "text-foreground", bold ? "font-semibold" : "")}
        style={nepaliTextStyle(CELL_FONT)}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MatrixHeader({ card, showSarvashtaka }: { card: Card; showSarvashtaka?: boolean }) {
  return (
    <TableHeader>
      <TableHeaderCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth}>
        <TableHeaderLabel fontSize={HEADER_FONT}>{card.rashiHeader}</TableHeaderLabel>
      </TableHeaderCell>
      {card.targets.map((tg) => (
        <TableHeaderCell key={tg.key} flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth} className="items-end">
          <AshtakavargaTargetHead target={tg} />
        </TableHeaderCell>
      ))}
      {showSarvashtaka ? (
        <TableHeaderCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} className="items-end">
          <TableHeaderLabel fontSize={HEADER_FONT} numberOfLines={1}>
            {card.sarvHeader}
          </TableHeaderLabel>
        </TableHeaderCell>
      ) : null}
    </TableHeader>
  );
}

function AshtakavargaMatrix({
  card,
  matrix,
  showSarvashtaka = true,
}: {
  card: Card;
  matrix: Card["matrices"][number];
  showSarvashtaka?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View>
      <Text className={av.blockTitle} style={nepaliTextStyle(15)}>
        {matrix.title}
      </Text>
      <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
        <View className="w-full">
          <MatrixHeader card={card} showSarvashtaka={showSarvashtaka} />
          {matrix.rows.map((row, rowIndex) => (
            <TableRow key={row.rashi} rowIndex={rowIndex}>
              <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
                <View className="flex-row items-center gap-1.5">
                  <RashiGlyphIcon name={row.rashiNe} number={row.rashi} size={RASHI_ICON} />
                  <Text className="text-sm text-foreground" style={nepaliTextStyle(RASHI_FONT)}>
                    {row.name}
                  </Text>
                </View>
              </TableCell>
              {row.values.map((v, i) => (
                <TableCell key={card.targets[i]!.key} flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth} align="right">
                  {numCell(v)}
                </TableCell>
              ))}
              {showSarvashtaka ? (
                <TableCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} align="right">
                  {numCell(row.sarvashtaka, true)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <View
            className="w-full flex-row border-t border-border"
            style={{ backgroundColor: colorWithAlpha(colors.muted, 0.35) }}
          >
            <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
              <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(CELL_FONT)}>
                {card.totalLabel}
              </Text>
            </TableCell>
            {matrix.totals.map((v, i) => (
              <TableCell key={card.targets[i]!.key} flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth} align="right">
                {numCell(v)}
              </TableCell>
            ))}
            {showSarvashtaka ? (
              <TableCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} align="right">
                {numCell(matrix.sarvTotal)}
              </TableCell>
            ) : null}
          </View>
        </View>
      </TableScrollShell>
    </View>
  );
}

function ShodhyaPindaTable({ card }: { card: Card }) {
  return (
    <View>
      <Text className={av.blockTitle} style={nepaliTextStyle(15)}>
        {card.shodhya.title}
      </Text>
      <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
        <View className="w-full">
          <TableHeader>
            <TableHeaderCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth}>
              <View />
            </TableHeaderCell>
            {card.targets.map((tg) => (
              <TableHeaderCell key={tg.key} flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth} className="items-end">
                <AshtakavargaTargetHead target={tg} />
              </TableHeaderCell>
            ))}
          </TableHeader>
          {card.shodhya.rows.map((metric, rowIndex) => (
            <TableRow key={metric.key} rowIndex={rowIndex} highlight={metric.emphasize}>
              <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
                <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(CELL_FONT)}>
                  {metric.label}
                </Text>
              </TableCell>
              {metric.values.map((v, i) => (
                <TableCell key={card.targets[i]!.key} flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth} align="right">
                  {numCell(v, metric.emphasize)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </View>
      </TableScrollShell>
    </View>
  );
}

export function AshtakavargaCard({
  data,
  compactHeader = false,
}: {
  data: AshtakavargaData;
  compactHeader?: boolean;
}) {
  const card = useAshtakavargaCard(data);

  if (!data.raw?.length && !data.reduced?.length) return null;

  return (
    <View className={av.root}>
      {!compactHeader ? (
        <Text className={av.heading} style={nepaliTextStyle(13)}>
          {card.title}
        </Text>
      ) : null}
      <Text className={av.intro} style={nepaliTextStyle(14)}>
        {card.intro}
      </Text>

      {card.matrices.map((m) =>
        m.rows.length ? <AshtakavargaMatrix key={m.key} card={card} matrix={m} /> : null,
      )}

      {card.shodhya.hasRows ? <ShodhyaPindaTable card={card} /> : null}
    </View>
  );
}
