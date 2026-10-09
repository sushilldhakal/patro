import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import {
  buildPanchangaDetailCells,
  formatPatroSignedCorrection,
  getAbhijitMuhurta,
  getPlanetGocharLines,
  getSolarCorrections,
  type PanchangaDetailCell,
} from "@/lib/panchanga-format";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";

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

function VivaranCell({
  label,
  value,
  hint,
  wide,
  mono,
  insetBg,
}: PanchangaDetailCell & { insetBg: string }) {
  return (
    <View
      className={cn("min-w-0 rounded-lg p-2.5", wide && "col-span-2")}
      style={{ backgroundColor: insetBg }}
    >
      <Text className="text-body uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text
        className={cn(
          "text-body mt-1 font-semibold text-foreground",
          mono && "text-body font-num",
        )}
        style={mono ? nepaliTextStyle(14) : undefined}
      >
        {value ?? "—"}
      </Text>
      {hint ? (
        <Text className="text-body mt-0.5 text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
}

function GocharSolarCard({
  title,
  value,
  insetBg,
  tileWidth,
}: {
  title: string;
  value: string;
  insetBg: string;
  tileWidth: number | `${number}%`;
}) {
  return (
    <View
      className="min-w-0 gap-0.5 rounded-[5px] p-2.5"
      style={{
        backgroundColor: insetBg,
        width: tileWidth,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {title}
      </Text>
      <Text className="text-body font-num font-semibold text-foreground" style={nepaliTextStyle(14)}>
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
  insetBg,
  tileWidth,
}: {
  planetKey: string;
  label: string;
  rashi?: string;
  degree: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  insetBg: string;
  tileWidth: number | `${number}%`;
}) {
  return (
    <View
      className="min-w-0 gap-0.5 rounded-[5px] p-2.5"
      style={{
        backgroundColor: insetBg,
        width: tileWidth,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <View className="min-w-0 flex-row flex-wrap items-center gap-x-1 gap-y-0.5">
        <Text
          className="text-body min-w-0 shrink font-semibold text-foreground"
          style={nepaliTextStyle(14)}
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
      <Text className="text-body font-num font-semibold text-foreground" style={nepaliTextStyle(14)}>
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
    <View className="mt-2.5 border-t border-border/60 pt-2.5">
      {abhijit ? (
        <Text className="text-body text-foreground">
          <Text className="font-semibold">{t("abhijit.title")} </Text>
          <Text className="font-num font-semibold" style={nepaliTextStyle(14)}>
            {abhijit.rangeDisplay}
            {abhijit.noonDisplay
              ? isEn
                ? ` (noon ${abhijit.noonDisplay})`
                : ` (${t("abhijit.noon_short")} ${abhijit.noonDisplay})`
              : ""}
          </Text>
        </Text>
      ) : (
        <Text className="text-body text-muted-foreground">
          {t("abhijit.unavailable")}
        </Text>
      )}
      {selectedAd ? (
        <Pressable
          onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}
          className="mt-3 items-center rounded-lg border border-border py-2.5"
        >
          <Text className="text-body font-semibold text-foreground">
            {t("panchanga.detail_title")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PanchangaVivaranPanel({ p, selectedDay, selectedAd, loading }: Props) {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const [vivaranWrapWidth, setVivaranWrapWidth] = useState(0);
  const [gocharWrapWidth, setGocharWrapWidth] = useState(0);
  const vivaranTileW = useMemo(
    () => wrapTileWidth(vivaranWrapWidth, VIVARAN_WRAP_GAP, VIVARAN_MIN_TILE, 2, 2),
    [vivaranWrapWidth],
  );
  const gocharTileW = useMemo(
    () => wrapTileWidth(gocharWrapWidth, GOCHAR_WRAP_GAP, GOCHAR_MIN_TILE, 2, 3),
    [gocharWrapWidth],
  );

  if (loading || !p) {
    return (
      <View>
        <View className="mb-2.5 flex-row flex-wrap" style={{ gap: VIVARAN_WRAP_GAP }}>
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
    sunriseSunset: pick("सूर्योदय / सूर्यास्त", "Sunrise / Sunset"),
    moonrise: pick("चन्द्रोदय", "Moonrise"),
    ritu: pick("ऋतु", "Season"),
    nakshatra: pick("नक्षत्र", "Nakshatra"),
    yoga: pick("योग", "Yoga"),
    karana: pick("करण", "Karana"),
    dash: pick("—", "—"),
  });
  const planets = getPlanetGocharLines(p, lang);
  const solar = getSolarCorrections(p);
  const hasSolar =
    solar?.deshaantar != null || solar?.akshamsha != null || solar?.belaantar != null;
  const solarCards = hasSolar
    ? (
        [
          [pick("देशान्तर", "Deshaantar"), solar?.deshaantar] as const,
          [pick("अक्षांश", "Akshamsha"), solar?.akshamsha] as const,
          [pick("बेलान्तर", "Belaantar"), solar?.belaantar] as const,
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
        className="mb-2.5 flex-row flex-wrap"
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
            <VivaranCell {...cell} insetBg={colors.surfaceInset} />
          </View>
        ))}
      </View>

      {planets.length > 0 ? (
        <View className="mt-2.5 border-t border-border/60 pt-2.5">
          <Text className="text-body mb-1.5 font-bold text-foreground">
            {pick("ग्रह गोचर", "Planet positions")}
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
                insetBg={colors.surfaceInset}
                tileWidth={gocharTileW}
              />
            ))}
          </View>
        </View>
      ) : null}

      {solarCards.length > 0 ? (
        <View className={planets.length > 0 ? "mt-1.5 border-t border-border/60 pt-2" : "mt-2.5 border-t border-border/60 pt-2"}>
          <View className="flex-row" style={{ gap: GOCHAR_WRAP_GAP }}>
            {solarCards.map(({ label, value }) => (
              <View key={label} style={{ flex: 1 }}>
                <GocharSolarCard title={label} value={value} insetBg={colors.surfaceInset} tileWidth="100%" />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <AsideFooter p={p} selectedAd={selectedAd} />
    </View>
  );
}
