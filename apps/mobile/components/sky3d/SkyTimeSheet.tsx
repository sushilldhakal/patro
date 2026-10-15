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

import { Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@/components/icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { TIME_STEPS } from "@vedic-patro/domain/sky3d/time-steps";
import { illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { useSkyTimeSheet, type SkyTimeFieldView, type SkyTimeTransport } from "@vedic-patro/features/sky3d";
export { type WallParts } from "@vedic-patro/domain/sky3d/sky-time";

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

const JUMP_ICONS: Record<"prev" | "now" | "next", keyof typeof Ionicons.glyphMap> = {
  prev: "play-skip-back",
  now: "time-outline",
  next: "play-skip-forward",
};

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  rateValue,
  rateMax,
  onRate,
  onTogglePlay,
  onResetRate,
  transport: transportProp,
  onApplyMs,
  onClose,
}: {
  timeMs: number;
  zoneOffsetMs: number;
  /** Bipolar rung: negative runs backwards, 0 is paused. The speed controls show only with the four rate props (the 3D sky); the wheel's date dialog has none. */
  rateValue?: number;
  rateMax?: number;
  onRate?: (value: number) => void;
  onTogglePlay?: () => void;
  onResetRate?: () => void;
  /** The same speed row for a clock on its own ladder (the wheel's year playback); wins over the rate props. */
  transport?: SkyTimeTransport;
  onApplyMs: (ms: number) => void;
  onClose: () => void;
}) {
  /* The app's rate is a rung on the speed ladder; the sheet reads it as the
     simulated seconds per second it stands for. */
  const rung = Math.round(rateValue ?? 0);
  const timeRate = rung === 0 ? 0 : Math.sign(rung) * (TIME_STEPS[Math.min(Math.abs(rung), TIME_STEPS.length) - 1]?.seconds ?? 1);
  const v = useSkyTimeSheet({ timeMs, zoneOffsetMs, timeRate, onApplyMs });
  const transport: (SkyTimeTransport & { playing: boolean }) | null = transportProp
    ? { ...transportProp, playing: transportProp.rung !== 0 }
    : rateValue !== undefined && rateMax !== undefined && onRate && onTogglePlay && onResetRate
      ? { rung: rateValue, max: rateMax, label: v.speedLabel, playing: v.playing, onRung: onRate, onTogglePlay, onReset: onResetRate }
      : null;

  const stepper = (f: SkyTimeFieldView) => (
    <View key={f.field} className="items-center" style={{ width: f.wide ? 62 : 42 }}>
      <Pressable
        onPress={f.up}
        accessibilityRole="button"
        accessibilityLabel={f.upLabel}
        className="h-6 w-full items-center justify-center active:opacity-60"
      >
        <Ionicons name="chevron-up" size={15} color={withAlpha(neutral.white, 0.55)} />
      </Pressable>
      <Text
        className="text-title font-bold"
        style={[nepaliTextStyle(20, { dense: true }), { color: neutral.white, fontVariant: ["tabular-nums"] }]}
      >
        {f.value}
      </Text>
      <Pressable
        onPress={f.down}
        accessibilityRole="button"
        accessibilityLabel={f.downLabel}
        className="h-6 w-full items-center justify-center active:opacity-60"
      >
        <Ionicons name="chevron-down" size={15} color={withAlpha(neutral.white, 0.55)} />
      </Pressable>
    </View>
  );

  const sep = (glyph: string, key: string) => (
    <Text key={key} className="text-title font-bold" style={{ color: withAlpha(neutral.white, 0.4) }}>
      {glyph}
    </Text>
  );

  const navAction = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
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

  const withSeps = (fields: SkyTimeFieldView[], glyph: string) =>
    fields.flatMap((f, i) => (i === 0 ? [stepper(f)] : [sep(glyph, `sep-${f.field}`), stepper(f)]));

  return (
    /* A card floating clear of the sky's edges, not a sheet welded to the
       bottom of it — the web's own shape: centred, capped at a readable width,
       and rounded on every corner so the picture reads around it. */
    <View className="absolute inset-0 items-center justify-center px-3">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={v.labels.close}
        style={{ position: "absolute", inset: 0, backgroundColor: withAlpha(neutral.black, 0.4) }}
      />
      <View
        className="w-full rounded-3xl border border-white/10 px-4 pb-4 pt-2"
        style={{ maxWidth: 512, backgroundColor: withAlpha(illustration.gray11, 0.96) }}
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/30" />

        <View className="flex-row items-center justify-center gap-3">
          <View className="flex-row items-center">{withSeps(v.dateFields, "/")}</View>
          <View className="flex-row items-center">{withSeps(v.clockFields, ":")}</View>
        </View>

        {transport ? (
          <>
        <Text
          className="text-body mb-1 mt-4 text-center font-semibold"
          style={[nepaliTextStyle(13, { dense: true }), { color: withAlpha(neutral.white, 0.9) }]}
        >
          {transport.label}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={transport.onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={transport.playing ? v.labels.pause : v.labels.play}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          >
            <Ionicons name={transport.playing ? "pause" : "play"} size={22} color={neutral.white} />
          </Pressable>
          <Slider
            style={{ flex: 1, height: 32 }}
            minimumValue={-transport.max}
            maximumValue={transport.max}
            step={1}
            value={transport.rung}
            onValueChange={transport.onRung}
            minimumTrackTintColor={withAlpha(neutral.white, 0.75)}
            maximumTrackTintColor={withAlpha(neutral.white, 0.2)}
            thumbTintColor={neutral.white}
          />
          <Pressable
            onPress={transport.onReset}
            accessibilityRole="button"
            accessibilityLabel={v.labels.realtime}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          >
            <Ionicons name="refresh" size={20} color={neutral.white} />
          </Pressable>
        </View>
          </>
        ) : null}

        <View className="mt-3 flex-row">
          {v.jumps.map((jump) => navAction(jump.id, JUMP_ICONS[jump.id], jump.label, jump.run))}
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
              value={v.daySlider}
              onValueChange={v.setDaySlider}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={neutral.white}
            />
          </View>
          <View className="mt-1.5 h-4 flex-row justify-between">
            {v.dayPeriods.map((band) => (
              <Text
                key={band.id}
                className="text-caption"
                style={[
                  nepaliTextStyle(10, { dense: true }),
                  {
                    color: band.active ? neutral.white : withAlpha(neutral.white, 0.55),
                    fontWeight: band.active ? "600" : "500",
                  },
                ]}
              >
                {band.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default SkyTimeSheet;
