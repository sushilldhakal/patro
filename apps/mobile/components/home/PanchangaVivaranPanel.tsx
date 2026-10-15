import { useMemo, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { usePanchangaVivaran, type VivaranCell as VivaranCellData } from "@vedic-patro/features/home";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { patroAyanaNorth, patroAyanaSouth } from "@/lib/patro-classes";
import { fillGridCell, fillGridColumns } from "@/lib/fill-grid";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const VIVARAN_WRAP_GAP = 8;
const VIVARAN_MIN_TILE = 112;
const GOCHAR_WRAP_GAP = 6;
const GOCHAR_MIN_TILE = 148;

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAd?: string;
  loading?: boolean;
};

/* Web: `rounded-lg bg-surface-inset p-2.5 shadow-ring-soft` — the ring is a 1px gold hairline. */
/* The website draws the tile edge with a ring shadow; a hairline border is its native equivalent. */
const INSET_TILE = cn(homeClasses.vivaranTile, "border border-gold/25");

function VivaranCell({ label, value, hint, mono, ayana }: VivaranCellData) {
  return (
    <View className={INSET_TILE}>
      <Text className={homeClasses.vivaranLabel} style={nepaliTextStyle()}>
        {label}
      </Text>
      <Text
        className={cn(homeClasses.vivaranValue, mono && homeClasses.vivaranValueMono)}
        style={nepaliTextStyle()}
      >
        {value ?? "—"}
        {ayana ? <Text className={cn(ayana.north ? patroAyanaNorth : patroAyanaSouth, "mb-0 ml-1.5")}> {ayana.mark}</Text> : null}
      </Text>
      {hint ? (
        <Text className={homeClasses.vivaranHint} style={nepaliTextStyle()}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function GocharSolarCard({ title, value }: { title: string; value: string }) {
  return (
    <View className={cn(INSET_TILE, homeClasses.gocharTile)}>
      <Text className={homeClasses.gocharName} style={nepaliTextStyle()}>
        {title}
      </Text>
      <Text className={homeClasses.solarValue} style={nepaliTextStyle()}>
        {value}
      </Text>
    </View>
  );
}

function GocharPlanetCard({
  planetKey,
  label,
  rashi,
  degree,
  isRetrograde,
  isCombust,
  cellStyle,
}: {
  planetKey: string;
  label: string;
  rashi?: string;
  degree: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  cellStyle: ViewStyle;
}) {
  return (
    <View
      className={cn(INSET_TILE, homeClasses.gocharTile)}
      style={cellStyle}
    >
      <View className="min-w-0 flex-row flex-wrap items-center gap-x-1 gap-y-0.5">
        <Text
          className={cn("min-w-0 shrink", homeClasses.gocharName)}
          style={nepaliTextStyle()}
        >
          {label}
          {rashi ? (
            <>
              {" "}
              <Text>→</Text> {rashi}
            </>
          ) : null}
        </Text>
        <GrahaStatusBadges
          planetKey={planetKey}
          isRetrograde={isRetrograde}
          isCombust={isCombust}
          size={12}
        />
      </View>
      <Text className={homeClasses.gocharDegree} style={nepaliTextStyle()}>
        {degree}
      </Text>
    </View>
  );
}

function AsideFooter({ view, selectedAd }: { view: NonNullable<ReturnType<typeof usePanchangaVivaran>>; selectedAd?: string }) {
  const router = useRouter();
  return (
    <View className={homeClasses.vivaranFooter}>
      {view.abhijit ? (
        <Text className={homeClasses.vivaranFooterText} style={nepaliTextStyle()}>
          <Text className={homeClasses.vivaranFooterStrong}>{view.abhijit.title} </Text>
          <Text className={homeClasses.vivaranFooterNum}>{view.abhijit.range}</Text>
        </Text>
      ) : (
        <Text className="text-sm" style={nepaliTextStyle()}>
          {view.abhijitUnavailable}
        </Text>
      )}
      {selectedAd ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          label={view.detailLink}
          onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}
        />
      ) : null}
    </View>
  );
}

export function PanchangaVivaranPanel({ p, selectedDay, selectedAd, loading }: Props) {
  const view = usePanchangaVivaran({ p, selectedDay });
  const colors = useThemeColors();
  const [vivaranWrapWidth, setVivaranWrapWidth] = useState(0);
  const [gocharWrapWidth, setGocharWrapWidth] = useState(0);
  // At least two per row, more when they fit; rows always filled.
  const vivaranCell = useMemo(() => {
    const cols = fillGridColumns(vivaranWrapWidth, VIVARAN_MIN_TILE, VIVARAN_WRAP_GAP, 2, 4);
    return fillGridCell(vivaranWrapWidth, cols, VIVARAN_WRAP_GAP);
  }, [vivaranWrapWidth]);
  const gocharCell = useMemo(() => {
    const cols = fillGridColumns(gocharWrapWidth, GOCHAR_MIN_TILE, GOCHAR_WRAP_GAP, 2, 4);
    return fillGridCell(gocharWrapWidth, cols, GOCHAR_WRAP_GAP);
  }, [gocharWrapWidth]);

  if (loading || !p || !view) {
    return (
      <View>
        <View className={cn("flex-row flex-wrap", homeClasses.vivaranCells)} style={{ gap: VIVARAN_WRAP_GAP }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              className="h-16 rounded-lg p-2.5"
              style={[fillGridCell(0, 2, VIVARAN_WRAP_GAP), { backgroundColor: colors.surfaceInset }]}
            >
              <View className="h-3 w-16 rounded bg-muted-foreground/20" />
              <View className="mt-2 h-4 w-24 rounded bg-muted-foreground/20" />
            </View>
          ))}
        </View>
        <View className="mt-2.5 h-28 rounded-md bg-muted" />
      </View>
    );
  }

  return (
    <View>
      <View
        className={cn("flex-row flex-wrap", homeClasses.vivaranCells)}
        style={{ gap: VIVARAN_WRAP_GAP }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setVivaranWrapWidth((prev) => (prev === w ? prev : w));
        }}
      >
        {view.cells.map((cell) => (
          <View
            key={cell.label}
            style={vivaranCell}
            className="min-w-0"
          >
            <VivaranCell {...cell} />
          </View>
        ))}
      </View>

      {view.planets.length > 0 ? (
        <View className={homeClasses.gocharSection}>
          <Text className={homeClasses.gocharTitle} style={nepaliTextStyle()}>
            {view.gocharTitle}
          </Text>
          <View
            className="flex-row flex-wrap"
            style={{ gap: GOCHAR_WRAP_GAP }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setGocharWrapWidth((prev) => (prev === w ? prev : w));
            }}
          >
            {view.planets.map(({ key, label, rashi, degree, isRetrograde, isCombust }) => (
              <GocharPlanetCard
                key={key}
                planetKey={key}
                label={label}
                rashi={rashi}
                degree={degree}
                isRetrograde={isRetrograde}
                isCombust={isCombust}
                cellStyle={gocharCell}
              />
            ))}
          </View>
        </View>
      ) : null}

      {view.solar.length > 0 ? (
        <View className={view.planets.length > 0 ? homeClasses.solarWithPlanets : homeClasses.solarAlone}>
          <View className="flex-row" style={{ gap: GOCHAR_WRAP_GAP }}>
            {view.solar.map(({ label, value }) => (
              <View key={label} style={{ flex: 1 }}>
                <GocharSolarCard title={label} value={value} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <AsideFooter view={view} selectedAd={selectedAd} />
    </View>
  );
}
