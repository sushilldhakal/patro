/**
 * The clock over the 3D sky, in the web's own shape — wall-clock steppers, a
 * bipolar rate slider, previous/next night and jump-to-now, and a daylight
 * scrub whose gradient names the parts of the day.
 *
 * Ported from `SkyTimeSheet.tsx`: same controls in the same order, same
 * बिक्रम-in-नेपाली / Gregorian-in-English split on the date steppers. The rate
 * is this app's own speed ladder rather than the web's continuous ×10000
 * slider, because the transport buttons here already climb that ladder and two
 * different rate models on one screen cannot agree.
 */

import { useMemo } from "react";
import { Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@/components/icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/components/ui/Text";
import { adToBS, bsToAD, getBSMonthLength, shiftBsMonth } from "@vedic-patro/domain/bs-calendar";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { DAY_PERIODS, type WallParts, wallPartsFromMs, wallCivilUtc, periodIdAtHour } from "@vedic-patro/domain/sky3d/sky-time";
import { illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
export { type WallParts } from "@vedic-patro/domain/sky3d/sky-time";

/** Starts at बिहान (~04:00) so the labels read left → right as named. */
const DAY_ORIGIN_SEC = 4 * 3600;

/** बिहान → दिउँसो → सन्ध्या → जूनकिरण → मध्यरात. */
const DAYLIGHT_STOPS = [
  illustration.amber66,
  illustration.sky80,
  illustration.sky68,
  illustration.sky75b,
  midnight.saffron,
  illustration.orange54,
  illustration.violet33,
  illustration.sky19,
  illustration.sky70,
  midnight.background,
  wheel.sky2,
  illustration.violet24,
];

type Field = keyof WallParts;

/** Civil Gregorian → UTC ms, proleptic and era-safe for years 0–99. */
function utcMsFromWall(p: WallParts): number {
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  d.setUTCHours(p.hour, p.minute, p.second, 0);
  return d.getTime();
}

function nepaliYmd(p: WallParts): { year: number; month: number; day: number } {
  if (p.year >= 1643 && p.year <= 2144) {
    const bs = adToBS(wallCivilUtc(p));
    return { year: bs.year, month: bs.month, day: bs.day };
  }
  /* Past the compiled table the बिक्रम year is the Gregorian one plus the
     standard offset — good enough to step by, and marked ≈ everywhere it is
     read, exactly as the HUD's own stamp is. */
  const year = p.year + (p.month < 4 ? 56 : 57);
  const month = ((p.month - 4 + 12) % 12) + 1;
  return { year, month, day: Math.min(Math.max(1, p.day), 32) };
}

function applyBsYmd(p: WallParts, year: number, month: number, day: number): WallParts {
  const m = ((month - 1 + 12) % 12) + 1;
  const length = getBSMonthLength(year, m) || 30;
  const d = Math.min(Math.max(1, day), length);
  const ad = bsToAD(year, m, d);
  return { ...p, year: ad.getFullYear(), month: ad.getMonth() + 1, day: ad.getDate() };
}

function stepBsField(p: WallParts, field: "year" | "month" | "day", delta: number): WallParts {
  const bs = nepaliYmd(p);
  if (field === "year") return applyBsYmd(p, bs.year + delta, bs.month, bs.day);
  if (field === "month") {
    const next = shiftBsMonth(bs.year, bs.month, delta);
    return applyBsYmd(p, next.year, next.month, bs.day);
  }
  let day = bs.day + delta;
  let { year, month } = bs;
  for (let i = 0; i < 24 && day > getBSMonthLength(year, month); i += 1) {
    day -= getBSMonthLength(year, month);
    const next = shiftBsMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }
  for (let i = 0; i < 24 && day < 1; i += 1) {
    const prev = shiftBsMonth(year, month, -1);
    year = prev.year;
    month = prev.month;
    day += getBSMonthLength(year, month);
  }
  return applyBsYmd(p, year, month, day);
}

function addField(p: WallParts, field: Field, delta: number): WallParts {
  const d = new Date(utcMsFromWall(p));
  if (field === "year") d.setUTCFullYear(d.getUTCFullYear() + delta);
  else if (field === "month") d.setUTCMonth(d.getUTCMonth() + delta);
  else if (field === "day") d.setUTCDate(d.getUTCDate() + delta);
  else if (field === "hour") d.setUTCHours(d.getUTCHours() + delta);
  else if (field === "minute") d.setUTCMinutes(d.getUTCMinutes() + delta);
  else d.setUTCSeconds(d.getUTCSeconds() + delta);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, "0");
}

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  nepaliCal,
  digits,
  pick,
  speedLabel,
  playing,
  rateValue,
  rateMax,
  onRate,
  onTogglePlay,
  onResetRate,
  onApplyMs,
  onClose,
}: {
  timeMs: number;
  zoneOffsetMs: number;
  /** नेपाली steps विक्रम संवत्; English keeps Gregorian, as on the web. */
  nepaliCal: boolean;
  digits: (value: string | number) => string;
  pick: (ne: string, en: string) => string;
  speedLabel: string;
  playing: boolean;
  /** Bipolar rung: negative runs backwards, 0 is paused. */
  rateValue: number;
  rateMax: number;
  onRate: (value: number) => void;
  onTogglePlay: () => void;
  onResetRate: () => void;
  onApplyMs: (ms: number) => void;
  onClose: () => void;
}) {
  const parts = wallPartsFromMs(timeMs, zoneOffsetMs);
  const ne = nepaliCal ? nepaliYmd(parts) : null;
  const daySec = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const activePeriod = periodIdAtHour(parts.hour);

  const apply = (next: WallParts) => onApplyMs(utcMsFromWall(next) - zoneOffsetMs);
  const step = (field: Field, delta: number) => {
    if (nepaliCal && (field === "year" || field === "month" || field === "day")) {
      apply(stepBsField(parts, field, delta));
      return;
    }
    apply(addField(parts, field, delta));
  };

  const plain = (field: Field): string => {
    if (field === "year") return String(ne ? ne.year : parts.year);
    if (field === "month") return pad2(ne ? ne.month : parts.month);
    if (field === "day") return pad2(ne ? ne.day : parts.day);
    if (field === "hour") return pad2(parts.hour);
    if (field === "minute") return pad2(parts.minute);
    return pad2(parts.second);
  };

  const stepper = (field: Field, label: string, wide?: boolean) => (
    <View className="items-center" style={{ width: wide ? 62 : 42 }}>
      <Pressable
        onPress={() => step(field, 1)}
        accessibilityRole="button"
        accessibilityLabel={pick(tFor("ne", "ui.sky3d.increase", { v0: label }), tFor("en", "ui.sky3d.increase", { v0: label }))}
        className="h-6 w-full items-center justify-center active:opacity-60"
      >
        <Ionicons name="chevron-up" size={15} color={withAlpha(neutral.white, 0.55)} />
      </Pressable>
      <Text
        className="text-title font-bold"
        style={[nepaliTextStyle(20, { dense: true }), { color: neutral.white, fontVariant: ["tabular-nums"] }]}
      >
        {digits(plain(field))}
      </Text>
      <Pressable
        onPress={() => step(field, -1)}
        accessibilityRole="button"
        accessibilityLabel={pick(tFor("ne", "ui.sky3d.decrease", { v0: label }), tFor("en", "ui.sky3d.decrease", { v0: label }))}
        className="h-6 w-full items-center justify-center active:opacity-60"
      >
        <Ionicons name="chevron-down" size={15} color={withAlpha(neutral.white, 0.55)} />
      </Pressable>
    </View>
  );

  const sep = (glyph: string) => (
    <Text className="text-title font-bold" style={{ color: withAlpha(neutral.white, 0.4) }}>
      {glyph}
    </Text>
  );

  const navAction = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center gap-1 rounded-xl py-2 active:opacity-60"
    >
      <Ionicons name={icon} size={22} color={neutral.white} />
      <Text
        numberOfLines={1}
        className="text-caption font-semibold"
        style={[nepaliTextStyle(11, { dense: true }), { color: withAlpha(neutral.white, 0.75) }]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const daySlider = useMemo(() => (daySec - DAY_ORIGIN_SEC + 86_400) % 86_400, [daySec]);

  return (
    /* A card floating clear of the sky's edges, not a sheet welded to the
       bottom of it — the web's own shape: centred, capped at a readable width,
       and rounded on every corner so the picture reads around it. */
    <View className="absolute inset-0 items-center justify-center px-3">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={pick(tFor("ne", "ui.common.close"), tFor("en", "ui.common.close"))}
        style={{ position: "absolute", inset: 0, backgroundColor: withAlpha(neutral.black, 0.4) }}
      />
      <View
        className="w-full rounded-3xl border border-white/10 px-4 pb-4 pt-2"
        style={{ maxWidth: 512, backgroundColor: withAlpha(illustration.gray11, 0.96) }}
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/30" />

        <View className="flex-row items-center justify-center gap-3">
          <View className="flex-row items-center">
            {stepper("year", pick(tFor("ne", "ui.sky3d.year"), tFor("en", "ui.sky3d.year")), true)}
            {sep("/")}
            {stepper("month", pick(tFor("ne", "ui.sky3d.month"), tFor("en", "ui.sky3d.month")))}
            {sep("/")}
            {stepper("day", pick(tFor("ne", "common.day"), tFor("en", "common.day")))}
          </View>
          <View className="flex-row items-center">
            {stepper("hour", pick(tFor("ne", "ui.sky3d.hour"), tFor("en", "ui.sky3d.hour")))}
            {sep(":")}
            {stepper("minute", pick(tFor("ne", "ui.sky3d.minute"), tFor("en", "ui.sky3d.minute")))}
            {sep(":")}
            {stepper("second", pick(tFor("ne", "ui.sky3d.second"), tFor("en", "ui.sky3d.second")))}
          </View>
        </View>

        <Text
          className="text-body mb-1 mt-4 text-center font-semibold"
          style={[nepaliTextStyle(13, { dense: true }), { color: withAlpha(neutral.white, 0.9) }]}
        >
          {speedLabel}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? pick(tFor("ne", "panchanga.hora.pause"), tFor("en", "panchanga.hora.pause")) : pick(tFor("ne", "panchanga.hora.play"), tFor("en", "panchanga.hora.play"))}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          >
            <Ionicons name={playing ? "pause" : "play"} size={22} color={neutral.white} />
          </Pressable>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={-rateMax}
            maximumValue={rateMax}
            step={1}
            value={rateValue}
            onValueChange={onRate}
            minimumTrackTintColor={withAlpha(neutral.white, 0.75)}
            maximumTrackTintColor={withAlpha(neutral.white, 0.2)}
            thumbTintColor={neutral.white}
          />
          <Pressable
            onPress={onResetRate}
            accessibilityRole="button"
            accessibilityLabel={pick(tFor("ne", "ui.sky3d.realtime_speed"), tFor("en", "ui.sky3d.realtime_speed"))}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          >
            <Ionicons name="refresh" size={20} color={neutral.white} />
          </Pressable>
        </View>

        <View className="mt-3 flex-row">
          {navAction("play-skip-back", pick(tFor("ne", "ui.sky3d.previous_night"), tFor("en", "ui.sky3d.previous_night")), () =>
            onApplyMs(timeMs - 86_400_000),
          )}
          {navAction("time-outline", pick(tFor("ne", "ui.sky3d.set_time_to_now"), tFor("en", "ui.sky3d.set_time_to_now")), () =>
            onApplyMs(Date.now()),
          )}
          {navAction("play-skip-forward", pick(tFor("ne", "ui.sky3d.next_night"), tFor("en", "ui.sky3d.next_night")), () =>
            onApplyMs(timeMs + 86_400_000),
          )}
        </View>

        {/* The daylight scrub: the gradient is the day itself, so the handle
            sits in the colour the sky will be when it lands. */}
        <View className="mt-3">
          <View className="h-8 justify-center">
            <LinearGradient
              colors={DAYLIGHT_STOPS as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: "absolute", left: 0, right: 0, height: 12 }}
              className="rounded-full"
            />
            <Slider
              style={{ width: "100%", height: 32 }}
              minimumValue={0}
              maximumValue={86_399}
              step={60}
              value={daySlider}
              onValueChange={(v) => {
                const sec = (v + DAY_ORIGIN_SEC) % 86_400;
                apply({
                  ...parts,
                  hour: Math.floor(sec / 3600),
                  minute: Math.floor((sec % 3600) / 60),
                  second: sec % 60,
                });
              }}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={neutral.white}
            />
          </View>
          <View className="mt-1.5 h-4 flex-row justify-between">
            {DAY_PERIODS.map((band) => (
              <Text
                key={band.id}
                className="text-caption"
                style={[
                  nepaliTextStyle(10, { dense: true }),
                  {
                    color: band.id === activePeriod ? neutral.white : withAlpha(neutral.white, 0.55),
                    fontWeight: band.id === activePeriod ? "600" : "500",
                  },
                ]}
              >
                {pick(band.ne, band.en)}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default SkyTimeSheet;
