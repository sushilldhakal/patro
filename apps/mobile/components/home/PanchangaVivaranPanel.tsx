import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import {
  formatPatroSignedCorrection,
  getAbhijitMuhurta,
  getPlanetGocharLines,
  getSolarCorrections,
} from "@vedic-patro/domain/panchanga-format";
import { buildPanchangaDetailCells, type PanchangaDetailCell } from "@/lib/panchanga-detail-cells";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const VIVARAN_WRAP_GAP = 8;
const VIVARAN_MIN_TILE = 112;
const GOCHAR_WRAP_GAP = 6;
const GOCHAR_MIN_TILE = 148;

function wrapTileWidth(
  containerWidth: number,
  gap: number,
  minTile: number,
  minCols: number,
  maxCols: number,
): number | `${number}%` {
  if (containerWidth <= 0) return minCols <= 1 ? "100%" : "48%";
  const cols = Math.min(
    maxCols,
    Math.max(minCols, Math.floor((containerWidth + gap) / (minTile + gap))),
  );
  return (containerWidth - gap * (cols - 1)) / cols;
}

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAd?: string;
  loading?: boolean;
};

/* Web: `rounded-lg bg-surface-inset p-2.5 shadow-ring-soft` — the ring is a 1px gold hairline. */
/* The website draws the tile edge with a ring shadow; a hairline border is its native equivalent. */
const INSET_TILE = cn(homeClasses.vivaranTile, "border border-gold/25");

function VivaranCell({ label, value, hint, wide, mono }: PanchangaDetailCell) {
  return (
    <View className={cn(INSET_TILE, wide && "col-span-2")}>
      <Text className={homeClasses.vivaranLabel} style={nepaliTextStyle()}>
        {label}
      </Text>
      <Text
        className={cn(homeClasses.vivaranValue, mono && homeClasses.vivaranValueMono)}
        style={nepaliTextStyle()}
      >
        {value ?? "—"}
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
  tileWidth,
}: {
  planetKey: string;
  label: string;
  rashi?: string;
  degree: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  tileWidth: number | `${number}%`;
}) {
  return (
    <View
      className={cn(INSET_TILE, homeClasses.gocharTile)}
      style={{
        width: tileWidth,
        flexGrow: 0,
        flexShrink: 0,
      }}
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

function AsideFooter({ p, selectedAd }: { p: PanchangaDay; selectedAd?: string }) {
  const { t, lang } = useLocale();
  const router = useRouter();
  const abhijit = getAbhijitMuhurta(p);
  const isEn = lang === "en";

  return (
    <View className={homeClasses.vivaranFooter}>
      {abhijit ? (
        <Text className={homeClasses.vivaranFooterText} style={nepaliTextStyle()}>
          <Text className={homeClasses.vivaranFooterStrong}>{t("abhijit.title")} </Text>
          <Text className={homeClasses.vivaranFooterNum}>
            {abhijit.rangeDisplay}
            {abhijit.noonDisplay
              ? isEn
                ? ` (noon ${abhijit.noonDisplay})`
                : ` (${t("abhijit.noon_short")} ${abhijit.noonDisplay})`
              : ""}
          </Text>
        </Text>
      ) : (
        <Text className="text-sm" style={nepaliTextStyle()}>
          {t("abhijit.unavailable")}
        </Text>
      )}
      {selectedAd ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          label={t("panchanga.detail_title")}
          onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}
        />
      ) : null}
    </View>
  );
}

export function PanchangaVivaranPanel({ p, selectedDay, selectedAd, loading }: Props) {
  const { t, pick, lang } = useLocale();
  const colors = useThemeColors();
  const { width: windowWidth } = useBreakpoint();
  const [vivaranWrapWidth, setVivaranWrapWidth] = useState(0);
  const [gocharWrapWidth, setGocharWrapWidth] = useState(0);
  const vivaranTileW = useMemo(
    () => wrapTileWidth(vivaranWrapWidth, VIVARAN_WRAP_GAP, VIVARAN_MIN_TILE, 2, 2),
    [vivaranWrapWidth],
  );
  /* Web `grid-cols-2 sm:grid-cols-3` on the viewport width. */
  const gocharCols = windowWidth >= 640 ? 3 : 2;
  const gocharTileW = useMemo(
    () => wrapTileWidth(gocharWrapWidth, GOCHAR_WRAP_GAP, GOCHAR_MIN_TILE, gocharCols, gocharCols),
    [gocharWrapWidth, gocharCols],
  );

  if (loading || !p) {
    return (
      <View>
        <View className={cn("flex-row flex-wrap", homeClasses.vivaranCells)} style={{ gap: VIVARAN_WRAP_GAP }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              className="h-16 rounded-lg p-2.5"
              style={{ backgroundColor: colors.surfaceInset, width: "48%", flexGrow: 0, flexShrink: 0 }}
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

  const cells = buildPanchangaDetailCells(p, lang, selectedDay, {
    sunriseSunset: t("aside.sunrise_sunset"),
    moonrise: t("sections.moonrise"),
    ritu: t("sections.ritu"),
    nakshatra: t("nakshatra"),
    yoga: t("kundali.yoga"),
    karana: t("kundali.karana"),
    dash: pick("—", "—"),
  });
  const planets = getPlanetGocharLines(p, lang);
  const solar = getSolarCorrections(p);
  const hasSolar =
    solar?.deshaantar != null || solar?.akshamsha != null || solar?.belaantar != null;
  const solarCards = hasSolar
    ? (
        [
          [t("aside.deshaantar"), solar?.deshaantar] as const,
          [t("aside.akshamsha"), solar?.akshamsha] as const,
          [t("aside.belaantar"), solar?.belaantar] as const,
        ] as const
      )
        .filter(([, block]) => block != null)
        .map(([label, block]) => ({
          label,
          value: formatPatroSignedCorrection(block) ?? "—",
        }))
    : [];

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
        {cells.map((cell) => (
          <View
            key={cell.label}
            style={{
              width: cell.wide ? "100%" : vivaranTileW,
              flexGrow: 0,
              flexShrink: 0,
            }}
            className="min-w-0"
          >
            <VivaranCell {...cell} />
          </View>
        ))}
      </View>

      {planets.length > 0 ? (
        <View className={homeClasses.gocharSection}>
          <Text className={homeClasses.gocharTitle} style={nepaliTextStyle()}>
            {t("ui.home.planet_positions")}
          </Text>
          <View
            className="flex-row flex-wrap"
            style={{ gap: GOCHAR_WRAP_GAP }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setGocharWrapWidth((prev) => (prev === w ? prev : w));
            }}
          >
            {planets.map(({ key, label, rashi, degree, isRetrograde, isCombust }) => (
              <GocharPlanetCard
                key={key}
                planetKey={key}
                label={label}
                rashi={rashi}
                degree={degree}
                isRetrograde={isRetrograde}
                isCombust={isCombust}
                tileWidth={gocharTileW}
              />
            ))}
          </View>
        </View>
      ) : null}

      {solarCards.length > 0 ? (
        <View className={planets.length > 0 ? homeClasses.solarWithPlanets : homeClasses.solarAlone}>
          <View className="flex-row" style={{ gap: GOCHAR_WRAP_GAP }}>
            {solarCards.map(({ label, value }) => (
              <View key={label} style={{ flex: 1 }}>
                <GocharSolarCard title={label} value={value} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <AsideFooter p={p} selectedAd={selectedAd} />
    </View>
  );
}
