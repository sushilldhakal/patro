import { View, type ViewStyle } from "react-native"
import { Text } from "@/components/ui/Text"
import type { GocharGraha } from "@/lib/api";
import type { RashyadiSegment } from "@vedic-patro/domain/dainikKranti/rashyadi";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@/lib/utils";
import { GocharKundaliChart } from "./GocharKundaliChart";
import { GocharRashyadiTable } from "./GocharRashyadiTables";

type GrahaRow = GocharGraha & { key: string };

type RashyadiRange = {
  start: RashyadiSegment | null;
  end: RashyadiSegment | null;
};

type Props = {
  rashyadiRange: RashyadiRange;
  grahas: GrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  gocharLoading?: boolean;
  rashyadiLoading?: boolean;
};

/** Min width per header column before flex-wrap drops to 2 then 1 row. */
const HEADER_COL_MIN = 200;

function headerColStyle(width: number): ViewStyle {
  const basis = Math.max(HEADER_COL_MIN, Math.floor(width / 3) - 12);
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: basis,
    minWidth: Math.min(HEADER_COL_MIN, width - 24),
  };
}

export function GocharRashyadiBlock({
  rashyadiRange,
  grahas,
  papanshaLine,
  gapanshaLine,
  dateBs,
  dateAd,
  gocharLoading,
  rashyadiLoading,
}: Props) {
  const { pick } = useLocale();
  const { width } = useBreakpoint();

  const startVersion = rashyadiRange.start?.versionNe;
  const endVersion = rashyadiRange.end?.versionNe;
  const showEndHeader = Boolean(endVersion && endVersion !== startVersion);
  const kundaliTitle = startVersion
    ? `${startVersion} ${pick("गोचर कुण्डली", "Transit Chart")}`
    : pick("गोचर कुण्डली", "Transit Chart");

  const layout = width >= BREAKPOINTS.lg ? "three" : width >= BREAKPOINTS.md ? "two" : "one";
  const colStyle = headerColStyle(width);

  const startTable = rashyadiRange.start ? (
    <GocharRashyadiTable
      segment={rashyadiRange.start}
      kundaliGrahas={grahas}
      kundaliDateAd={dateAd}
      loading={rashyadiLoading}
      hideVersionHeader
      className="flex-1"
    />
  ) : null;

  const endTable = rashyadiRange.end ? (
    <GocharRashyadiTable
      segment={rashyadiRange.end}
      loading={rashyadiLoading}
      hideVersionHeader
      className="flex-1"
    />
  ) : null;

  const kundali = (
    <GocharKundaliChart
      grahas={grahas}
      gapanshaLine={gapanshaLine}
      papanshaLine={papanshaLine}
      dateBs={dateBs}
      dateAd={dateAd}
      loading={gocharLoading}
      hideTitle
      className={layout === "three" ? "mx-auto w-full max-w-[300px] shrink-0" : undefined}
    />
  );

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-start gap-x-4 gap-y-2">
        {startVersion ? (
          <View style={colStyle}>
            <Text
              className="text-body font-semibold text-secondary"
              style={nepaliTextStyle(14)}
            >
              {startVersion}
            </Text>
          </View>
        ) : null}

        <View style={colStyle}>
          <Text
            className={cn(
              "text-body font-semibold text-foreground",
              layout === "three" && "text-center",
            )}
            style={nepaliTextStyle(14)}
          >
            ✦ {kundaliTitle}
          </Text>
        </View>

        {showEndHeader && endVersion ? (
          <View style={colStyle}>
            <Text
              className={cn(
                "text-body font-semibold text-secondary",
                layout !== "one" && "text-right",
              )}
              style={nepaliTextStyle(14)}
            >
              {endVersion}
            </Text>
          </View>
        ) : null}
      </View>

      {layout === "three" ? (
        <View className="flex-row items-stretch gap-4">
          {startTable}
          {kundali}
          {endTable}
        </View>
      ) : layout === "two" ? (
        endTable ? (
          <View className="gap-4">
            <View className="flex-row items-stretch gap-4">
              {startTable}
              {endTable}
            </View>
            {kundali}
          </View>
        ) : (
          <View className="flex-row items-stretch gap-4">
            {startTable}
            {kundali}
          </View>
        )
      ) : (
        <View className="gap-4">
          {startTable}
          {kundali}
          {endTable}
        </View>
      )}
    </View>
  );
}
