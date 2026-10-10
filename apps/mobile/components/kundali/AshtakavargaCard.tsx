import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { RashiInline } from "@/components/kundali/KundaliGlyphLabels";
import {
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
  tableFlexColumn,
} from "@/components/ui/DataTable";
import type { AshtakavargaData, AshtakavargaSignRow, ShodhyaPindaRow } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const ASHTAKAVARGA_TARGETS = [
  "lagna",
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
] as const;

type Target = (typeof ASHTAKAVARGA_TARGETS)[number];

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

function binduFor(row: AshtakavargaSignRow, target: Target): number {
  const b = row.bindus;
  if (!b) return 0;
  const direct = b[target];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (target === "lagna") {
    const legacy = b.Lagna ?? b.ascendant;
    if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  }
  return 0;
}

function targetLabel(target: Target, lang: "ne" | "en"): string {
  if (target === "lagna") return lang === "en" ? "Ascendant" : "लग्न";
  const meta = GRAHA_NAME[target as GrahaKey];
  return meta ? (lang === "en" ? meta.en : meta.ne) : target;
}

function AshtakavargaTargetHead({ target }: { target: Target }) {
  const { lang } = useLocale();
  const label = targetLabel(target, lang);
  if (target !== "lagna") {
    return (
      <View className="items-end gap-1">
        <GrahaPlanetIcon graha={target as GrahaKey} size={GRAHA_ICON} />
        <TableHeaderLabel fontSize={HEADER_FONT} uppercase={false} numberOfLines={2}>
          {label}
        </TableHeaderLabel>
      </View>
    );
  }
  return (
    <View className="items-end">
      <TableHeaderLabel fontSize={HEADER_FONT} uppercase={false} numberOfLines={2}>
        {label}
      </TableHeaderLabel>
    </View>
  );
}

function numCell(value: string, bold?: boolean) {
  return (
    <View className="items-end justify-center">
      <Text
        className={cn("font-num text-foreground", bold ? "font-semibold" : "")}
        style={nepaliTextStyle(CELL_FONT)}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MatrixHeader({ showSarvashtaka }: { showSarvashtaka?: boolean }) {
  const { lang } = useLocale();
  return (
    <TableHeader>
      <TableHeaderCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth}>
        <TableHeaderLabel fontSize={HEADER_FONT}>{kundaliLabel("rashi", lang)}</TableHeaderLabel>
      </TableHeaderCell>
      {ASHTAKAVARGA_TARGETS.map((t) => (
        <TableHeaderCell
          key={t}
          flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth}
          className="items-end"
        >
          <AshtakavargaTargetHead target={t} />
        </TableHeaderCell>
      ))}
      {showSarvashtaka ? (
        <TableHeaderCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} className="items-end">
          <TableHeaderLabel fontSize={HEADER_FONT} numberOfLines={1}>
            {kundaliLabel("sarv", lang)}
          </TableHeaderLabel>
        </TableHeaderCell>
      ) : null}
    </TableHeader>
  );
}

function AshtakavargaMatrix({
  title,
  rows,
  showSarvashtaka = true,
}: {
  title: string;
  rows: AshtakavargaSignRow[];
  showSarvashtaka?: boolean;
}) {
  const { lang, digits } = useLocale();
  const colors = useThemeColors();

  return (
    <View className="gap-2">
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
        {title}
      </Text>
      <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
        <View className="w-full">
          <MatrixHeader showSarvashtaka={showSarvashtaka} />
          {rows.map((row, rowIndex) => (
            <TableRow key={row.rashi} rowIndex={rowIndex}>
              <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
                <RashiInline
                  rashiNum={row.rashi}
                  nameNe={row.rashiNe}
                  lang={lang}
                  size={RASHI_ICON}
                  textSize={RASHI_FONT}
                />
              </TableCell>
              {ASHTAKAVARGA_TARGETS.map((t) => (
                <TableCell
                  key={t}
                  flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth}
                  align="right"
                >
                  {numCell(digits(binduFor(row, t)))}
                </TableCell>
              ))}
              {showSarvashtaka ? (
                <TableCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} align="right">
                  {numCell(digits(row.sarvashtaka), true)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <View
            className="w-full flex-row border-t border-border"
            style={{ backgroundColor: colorWithAlpha(colors.muted, 0.35) }}
          >
            <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
              <Text className="font-semibold text-foreground" style={nepaliTextStyle(CELL_FONT)}>
                {kundaliLabel("sarvashtaka", lang)}
              </Text>
            </TableCell>
            {ASHTAKAVARGA_TARGETS.map((t) => (
              <TableCell
                key={t}
flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth}
                align="right"
              >
                {numCell(digits(rows.reduce((s, r) => s + binduFor(r, t), 0)))}
              </TableCell>
            ))}
            {showSarvashtaka ? (
              <TableCell flex={SARV_COL.flex} minWidth={SARV_COL.minWidth} align="right">
                {numCell(digits(rows.reduce((s, r) => s + r.sarvashtaka, 0)))}
              </TableCell>
            ) : null}
          </View>
        </View>
      </TableScrollShell>
    </View>
  );
}

function ShodhyaPindaTable({ rows }: { rows: ShodhyaPindaRow[] }) {
  const { lang, digits } = useLocale();
  const metricRows: {
    key: keyof Pick<ShodhyaPindaRow, "rashiPinda" | "grahaPinda" | "shodhyaPinda">;
    ne: string;
    en: string;
  }[] = [
    { key: "rashiPinda", ne: "राशि", en: "Rashi" },
    { key: "grahaPinda", ne: "ग्रह", en: "Graha" },
    { key: "shodhyaPinda", ne: "शोध्य", en: "Shodhya" },
  ];

  return (
    <View className="gap-2">
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
        {kundaliLabel("shodhya_pinda", lang)}
      </Text>
      <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
        <View className="w-full">
          <TableHeader>
            <TableHeaderCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth}>
              <View />
            </TableHeaderCell>
            {ASHTAKAVARGA_TARGETS.map((t) => (
              <TableHeaderCell
                key={t}
                flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth}
                className="items-end"
              >
                <AshtakavargaTargetHead target={t} />
              </TableHeaderCell>
            ))}
          </TableHeader>
          {metricRows.map((metric, rowIndex) => {
            const emphasize = metric.key === "shodhyaPinda";
            return (
              <TableRow
                key={metric.key}
                rowIndex={rowIndex}
                highlight={emphasize}
              >
                <TableCell flex={RASHI_COL.flex} minWidth={RASHI_COL.minWidth} align="left">
                  <Text className="font-semibold text-foreground" style={nepaliTextStyle(CELL_FONT)}>
                    {lang === "en" ? metric.en : metric.ne}
                  </Text>
                </TableCell>
                {ASHTAKAVARGA_TARGETS.map((t) => {
                  const row = rows.find((r) => r.target === t);
                  const val = row?.[metric.key];
                  return (
                    <TableCell
                      key={t}
                      flex={GRAHA_COL.flex} minWidth={GRAHA_COL.minWidth}
                      align="right"
                    >
                      {numCell(val != null ? digits(val) : "—", emphasize)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
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
  const { lang } = useLocale();

  if (!data.raw?.length && !data.reduced?.length) return null;

  return (
    <View className="gap-6">
      {!compactHeader ? (
        <Text
          className="text-body font-semibold uppercase tracking-wide text-foreground"
          style={nepaliTextStyle(13)}
        >
          {kundaliLabel("ashtakavarga", lang)}
        </Text>
      ) : null}
      <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
        {kundaliLabel("ashtakavarga_intro", lang)}
      </Text>

      {data.raw?.length ? (
        <AshtakavargaMatrix title={kundaliLabel("ashtakavarga", lang)} rows={data.raw} />
      ) : null}

      {data.reduced?.length ? (
        <AshtakavargaMatrix
          title={kundaliLabel("reduced_ashtakavarga", lang)}
          rows={data.reduced}
        />
      ) : null}

      {data.shodhyaPinda?.length ? <ShodhyaPindaTable rows={data.shodhyaPinda} /> : null}
    </View>
  );
}
