import { useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { tithiName, TWO_SYSTEMS_SPEEDS } from "@vedic-patro/domain/sky3d/two-systems";
import { illustration, wheel, withAlpha } from "@vedic-patro/design-tokens";
import type { TwoSystemsPanelProps } from "../contract";

const FOCUS = [
  { id: "solar", key: "learn.study.two_systems.focus_solar" },
  { id: "lunar", key: "learn.study.two_systems.focus_lunar" },
  { id: "both", key: "learn.study.two_systems.focus_both" },
] as const;

export function TwoSystemsPanel(props: TwoSystemsPanelProps) {
  const { t, digits } = useLocale();
  const {
    focus,
    onFocus,
    speedIndex,
    onSpeed,
    playing,
    onTogglePlay,
    dayOfYear,
    onSeek,
    year,
    playIcon,
    pauseIcon,
    fullscreen = false,
    detailsOpen,
    onToggleDetails,
    expandIcon,
    collapseIcon,
  } = props;
  const day = Math.min(Math.max(dayOfYear, 0), year.yearDays);
  return (
    <View className={fullscreen ? "gap-2 px-3 pt-2" : "gap-2 border-t border-white/10 px-3 py-2.5"} style={{ backgroundColor: withAlpha(wheel.sky2, fullscreen ? 0.88 : 0.94) }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-1.5">
        {FOCUS.map((chip) => (
          <Pressable
            key={chip.id}
            onPress={() => onFocus(chip.id)}
            className={cn("h-8 items-center justify-center rounded-full border px-3", focus === chip.id ? "border-transparent bg-white" : "border-white/20")}
          >
            <Text className={focus === chip.id ? "text-sm font-semibold text-black" : "text-sm font-semibold text-white/70"}>{t(chip.key)}</Text>
          </Pressable>
        ))}
        {TWO_SYSTEMS_SPEEDS.map((speed, index) => (
          <Pressable
            key={speed}
            onPress={() => onSpeed(index)}
            className={cn("h-8 items-center justify-center rounded-full border px-2.5", speedIndex === index ? "border-transparent bg-white" : "border-white/20")}
          >
            <Text className={speedIndex === index ? "font-num text-xs font-semibold text-black" : "font-num text-xs font-semibold text-white/60"}>
              {digits(speed)}×
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View className="flex-row items-center gap-2">
        <Pressable onPress={onTogglePlay} accessibilityRole="button" accessibilityLabel={playing ? t("learn.pause") : t("learn.play")} className="h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10">
          {playing ? pauseIcon : playIcon}
        </Pressable>
        <Scrub
          max={year.yearDays}
          value={day}
          label={t("learn.playground.scrub_year")}
          onChange={(value) => onSeek(year.yearStartDt + value)}
        />
        <Text className="font-num text-xs text-white/60">
          {digits(Math.max(0, Math.floor(dayOfYear)))}/{digits(Math.round(year.yearDays))}
        </Text>
        {onToggleDetails ? (
          <Pressable onPress={onToggleDetails} accessibilityRole="button" accessibilityLabel={t("learn.study.two_systems.readings")} className="h-8 w-8 items-center justify-center rounded-full border border-white/20">
            {detailsOpen ? collapseIcon : expandIcon}
          </Pressable>
        ) : null}
      </View>
      {detailsOpen ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2 pb-2">
          <Readings {...props} />
          <DriftLadder {...props} />
        </ScrollView>
      ) : null}
    </View>
  );
}

function Readings({ solar, lunar, moonLongitude, travelledMoon, travelledSun, distanceAu }: TwoSystemsPanelProps) {
  const { t, lang, digits } = useLocale();
  const ne = lang !== "en";
  const moonRashi = Math.floor(moonLongitude / 30) % 12;
  const lapDone = travelledMoon >= 360;
  const cells = [
    [t("learn.study.two_systems.solar_month_gate"), `${ne ? solar.monthNameNe : solar.monthName} ${digits(solar.gate)}`],
    [t("learn.study.two_systems.sun_in_rashi"), `${digits(Math.floor(solar.longitude))}° · ${t("dainik.sign")} ${digits(solar.rashiIndex + 1)}`],
    [t("learn.study.two_systems.moon_in_rashi"), `${getRashiName(moonRashi + 1, lang)} · ${digits(Math.floor(moonLongitude))}°`],
    [t("learn.study.two_systems.moon_sun_angle"), `${digits(lunar.elongation.toFixed(1))}°`],
    [t("learn.study.two_systems.tithi_paksha"), `${tithiName(lunar)} · ${lunar.shukla ? t("learn.shukla") : t("learn.krishna")}`],
  ];
  return (
    <View className="gap-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {cells.map(([label, value]) => (
          <View key={label} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
            <Text className="text-diagram-xs text-white/55">{label}</Text>
            <Text className="text-sm font-semibold text-white">{value}</Text>
          </View>
        ))}
      </ScrollView>
      <View className="gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
        <Text className="text-xs font-semibold text-sky-200">{t("learn.study.two_systems.moon_travelled")}</Text>
        <Text className="font-num text-base font-bold text-white">
          {digits(travelledMoon.toFixed(1))}° {lapDone
            ? t("learn.study.two_systems.sidereal_lap_done", { degrees: digits((travelledMoon - 360).toFixed(1)) })
            : t("learn.study.two_systems.sidereal_lap_remaining", { degrees: digits((360 - travelledMoon).toFixed(1)) })}
        </Text>
        <Text className="text-xs text-white/55">{t("learn.study.two_systems.sidereal_vs_synodic")}</Text>
        <Text className="text-xs font-semibold text-amber-200">{t("learn.study.two_systems.sun_travelled")}</Text>
        <Text className="font-num text-base font-bold text-white">
          {digits(travelledSun.toFixed(1))}° / {digits(360)}° · {t("learn.study.two_systems.from_sun")} {digits(distanceAu.toFixed(4))} AU
        </Text>
        <Text className="text-xs text-white/55">{t("learn.study.two_systems.belt_pinned_to_stars")}</Text>
      </View>
    </View>
  );
}

function DriftLadder({ year, dayOfYear, lunarDone }: TwoSystemsPanelProps) {
  const { t, lang, digits } = useLocale();
  const ne = lang !== "en";
  const span = year.yearDays;
  const pct = (days: number) => `${(days / Math.max(span, 1)) * 100}%` as `${number}%`;
  const playhead = Math.min(Math.max(dayOfYear, 0), span);
  const shortfall = year.lunarShortfall;
  return (
    <View>
      <Text className="text-xs text-white/60">{t("learn.study.two_systems.one_timeline")}</Text>
      <Text className="font-num text-xs text-white/60">
        {t("learn.study.two_systems.ladder_summary", {
          solarDays: digits(span.toFixed(0)),
          lunarDays: digits(year.twelveLunarDays.toFixed(0)),
          gapDays: digits(shortfall.toFixed(0)),
        })}
      </Text>
      <View className="mt-1 h-6 flex-row overflow-hidden rounded-md">
        {year.solar.map((month, index) => (
          <View
            key={month.index}
            className="items-center justify-center overflow-hidden"
            style={{
              width: pct(month.days),
              backgroundColor: withAlpha(illustration.orange50, index % 2 ? 0.35 : 0.22),
            }}
          >
            <Text numberOfLines={1} className="text-diagram-xs font-semibold text-amber-50">
              {ne ? month.nameNe : month.name}
            </Text>
          </View>
        ))}
      </View>
      <View className="relative mt-1 h-5 overflow-hidden rounded-md bg-white/5">
        {year.lunar.map((month, index) => {
          const from = month.startDt - year.yearStartDt;
          if (from >= span) return null;
          return (
            <View
              key={month.index}
              className="absolute top-0 h-full items-center justify-center"
              style={{
                left: pct(Math.max(0, from)),
                width: pct(Math.min(month.days, span - from)),
                backgroundColor: index === 12 ? withAlpha(illustration.green52, 0.45) : withAlpha(illustration.teal60, index % 2 ? 0.35 : 0.22),
              }}
            >
              <Text className="text-diagram-xs font-semibold text-sky-50">{digits(index + 1)}</Text>
            </View>
          );
        })}
      </View>
      <View className="relative mt-1 h-4 overflow-hidden rounded-md bg-white/5">
        <View className="absolute bottom-0 left-0 top-0 items-center justify-center bg-sky-400/30" style={{ width: pct(year.twelveLunarDays) }}>
          <Text numberOfLines={1} className="text-diagram-xs font-semibold text-sky-50">
            {t("learn.study.two_systems.twelve_lunar_months_days", { days: digits(year.twelveLunarDays.toFixed(0)) })}
          </Text>
        </View>
        {shortfall > 0 ? (
          <View className="absolute bottom-0 right-0 top-0 items-center justify-center bg-emerald-400/35" style={{ width: pct(shortfall) }}>
            <Text className="text-diagram-xs font-bold text-emerald-50">{digits(shortfall.toFixed(0))}</Text>
          </View>
        ) : null}
        <View className="absolute bottom-0 top-0 w-px bg-white" style={{ left: pct(playhead) }} />
      </View>
      <Text className="mt-1.5 text-xs text-white/55">{t("learn.study.two_systems.legend_solar_months")}</Text>
      <Text className="text-xs text-white/55">{t("learn.study.two_systems.legend_lunar_months", { begun: digits(lunarDone) })}</Text>
      <Text className="text-xs text-white/55">{t("learn.study.two_systems.legend_remaining_gap")}</Text>
    </View>
  );
}

function Scrub({ max, value, onChange, label }: { max: number; value: number; onChange: (value: number) => void; label: string }) {
  const width = useRef(1);
  const place = (x: number) => {
    const raw = Math.min(1, Math.max(0, x / width.current)) * max;
    onChange(Math.round(raw * 4) / 4);
  };
  const left = `${(value / Math.max(max, 1)) * 100}%` as `${number}%`;
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      className="h-8 flex-1 justify-center"
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width || 1;
      }}
      onPress={(event) => place(event.nativeEvent.locationX)}
    >
      <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(illustration.sky65, 0.45) }}>
        <View className="h-full" style={{ width: left, backgroundColor: illustration.amber57 }} />
      </View>
    </Pressable>
  );
}
