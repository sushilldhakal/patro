/**
 * The frame of a Learn study, as the website lays one out: the drawing on the
 * article's own card, then a readout grid, a play button and scrub slider, a
 * row of presets, and a caption under it all.
 *
 * The website's classes are `tmCardPadLg`, `edReadout`, `edScrubWrap`,
 * `edPresets` and `tmCardCap`; each piece here is the app's drawing of one.
 */
import type { ReactNode } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { G } from "react-native-svg";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/design-tokens/cn";
import { neutral } from "@vedic-patro/design-tokens";
import { STUDY_FONT, useStudyInk } from "./study-ink";
import type { StudyView } from "./use-study-clock";

export function StudyCard({ view, children }: { view?: StudyView; children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <View
      ref={view?.ref}
      onLayout={view?.onLayout}
      className="my-4 gap-3 rounded-2xl border p-3 pb-5"
      style={{ backgroundColor: ink.card, borderColor: ink.border }}
    >
      {children}
    </View>
  );
}

/**
 * The drawing, at the width of the card and the height its viewBox asks for.
 * `fitScreen` keeps a square wheel from growing taller than the phone shows
 * at once (the website's `wheelFitScreen`).
 */
export function StudySvg({
  w,
  h,
  label,
  fitScreen,
  viewBox,
  maxWidth,
  overlay,
  children,
}: {
  w?: number;
  h?: number;
  label: string;
  fitScreen?: boolean;
  /** When the drawing's origin is not 0,0; `w`/`h` default to its size. */
  viewBox?: string;
  /** The website's `max-w-[…]`, in points. */
  maxWidth?: number;
  /** A touch layer laid over the drawing (drag handles). */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const ink = useStudyInk();
  if (viewBox && (!w || !h)) {
    const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);
    w = vw;
    h = vh;
  }
  w = w || 1;
  h = h || 1;
  return (
    <View
      className="w-full self-center"
      style={[
        { aspectRatio: w / h },
        fitScreen || maxWidth ? { maxWidth: Math.min(maxWidth ?? Infinity, fitScreen ? Math.max(260, height * 0.62) : Infinity) } : null,
      ]}
      accessible={!overlay}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg viewBox={viewBox ?? `0 0 ${w} ${h}`} width="100%" height="100%" color={ink.ink}>
        <G fontFamily={STUDY_FONT.regular}>{children}</G>
      </Svg>
      {overlay}
    </View>
  );
}

export type StudyReadout = { k: string; v: string; mono?: boolean; amber?: boolean };

/** Two columns on a phone, four from 560pt — the website's `edReadout` grid. */
export function StudyReadouts({ items }: { items: StudyReadout[] }) {
  const ink = useStudyInk();
  const { width } = useWindowDimensions();
  const cols = width >= 560 ? 4 : 2;
  return (
    <View className="flex-row flex-wrap px-1" style={{ rowGap: 10 }}>
      {items.map((r) => (
        <View key={r.k} className="min-w-0 gap-0.5 pr-3" style={{ width: `${100 / cols}%` }}>
          <Text className="text-xs font-semibold uppercase tracking-wide" style={[nepaliTextStyle(11), { color: ink.faint }]}>
            {r.k}
          </Text>
          <Text
            className="text-base font-bold leading-tight"
            style={[nepaliTextStyle(16), { color: r.amber ? ink.amber : r.mono ? ink.teal : ink.ink }]}
          >
            {r.v}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The label, play button and slider row (`motSliderRow` + `edScrubWrap`). */
export function StudyScrub({
  label,
  value,
  min,
  max,
  step = 0,
  playing,
  onToggle,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  playing?: boolean;
  onToggle?: () => void;
  onChange: (v: number) => void;
}) {
  const ink = useStudyInk();
  const { t } = useLocale();
  return (
    <View className="gap-1.5 px-1">
      <Text className="text-sm font-semibold tracking-wide" style={[nepaliTextStyle(13), { color: ink.faint }]}>
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        {onToggle ? (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={playing ? t("learn.pause") : t("learn.play")}
            className="h-10 w-10 items-center justify-center rounded-full border active:opacity-80"
            style={{ borderColor: ink.border, backgroundColor: ink.mix(ink.teal, 16) }}
          >
            <Ionicons name={playing ? "pause" : "play"} size={16} color={ink.ink} />
          </Pressable>
        ) : null}
        <Slider
          style={{ flex: 1, height: 36 }}
          value={value}
          minimumValue={min}
          maximumValue={max}
          step={step}
          onValueChange={onChange}
          minimumTrackTintColor={ink.teal}
          maximumTrackTintColor={ink.mix(ink.teal, 25)}
          thumbTintColor={ink.isDark ? ink.gold : ink.teal}
        />
      </View>
    </View>
  );
}

export type StudyPreset = { label: string; active?: boolean; onPress: () => void };

/** The preset chips (`edPresets` / `edPreset`). */
export function StudyPresets({ items }: { items: StudyPreset[] }) {
  const ink = useStudyInk();
  return (
    <View className="flex-row flex-wrap gap-1.5 px-1">
      {items.map((p) => (
        <Pressable
          key={p.label}
          onPress={p.onPress}
          accessibilityRole="button"
          accessibilityState={{ selected: !!p.active }}
          className={cn("h-8 justify-center rounded-full border px-3 active:opacity-80", p.active && "border-transparent")}
          style={
            p.active
              ? { backgroundColor: ink.isDark ? ink.gold : ink.teal }
              : { borderColor: ink.border }
          }
        >
          <Text
            className={cn("text-sm", p.active ? "font-bold" : "font-semibold")}
            style={[nepaliTextStyle(13), { color: p.active ? (ink.isDark ? neutral.black : neutral.white) : ink.dim }]}
          >
            {p.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The caption under a study (`tmCardCap`). */
export function StudyCaption({ children }: { children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text className="mt-1 px-1 text-center text-sm leading-relaxed" style={[nepaliTextStyle(14), { color: ink.faint }]}>
      {children}
    </Text>
  );
}

/** A small legend row: a swatch and a name per item. */
export function StudyLegend({ items }: { items: { color: string; label: string; ring?: boolean }[] }) {
  const ink = useStudyInk();
  return (
    <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5 px-1">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1.5">
          <View
            className="h-3 w-3 rounded-full"
            style={item.ring ? { borderWidth: 1.6, borderColor: item.color } : { backgroundColor: item.color }}
          />
          <Text className="text-xs" style={[nepaliTextStyle(12), { color: ink.dim }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ── The website's control markup, piece for piece ─────────────────────────
   The ported studies keep the website's layout tree; each of these is the app
   drawing of one class there (`edReadout`, `edRo`, `motSliderRow` …). */

/** `edControls` — the column under the drawing. */
export function StudyControls({ children }: { children: ReactNode }) {
  return <View className="gap-3.5 px-1 pb-1.5">{children}</View>;
}

/** `edReadout` — two columns on a phone, four from 560pt. */
export function StudyReadoutGrid({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row flex-wrap" style={{ rowGap: 10 }}>
      {children}
    </View>
  );
}

/** `edRo` — one readout cell. */
export function StudyRo({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <View className="min-w-0 gap-0.5 pr-3" style={{ width: width >= 560 ? "25%" : "50%" }}>
      {children}
    </View>
  );
}

/** `edRoK` — the readout's name. */
export function StudyRoK({ children }: { children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide" style={[nepaliTextStyle(12), { color: ink.faint }]}>
      {children}
    </Text>
  );
}

/** `edRoV({ mono, amber })` — the readout's value. */
export function StudyRoV({ mono, amber, children }: { mono?: boolean; amber?: boolean; children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text
      className="text-base font-bold leading-tight"
      style={[nepaliTextStyle(17), { color: amber ? ink.amber : mono ? ink.teal : ink.ink }]}
    >
      {children}
    </Text>
  );
}

/** `motSliderRow` — a label over a slider. */
export function StudySliderRow({ children }: { children: ReactNode }) {
  return <View className="w-full gap-1.5">{children}</View>;
}

/** `motSliderLabel`. */
export function StudySliderLabel({ children }: { children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text className="text-sm font-semibold tracking-wide" style={[nepaliTextStyle(14), { color: ink.faint }]}>
      {children}
    </Text>
  );
}

/** `edScrubWrap` — a play button beside a slider. */
export function StudyScrubRow({ children }: { children: ReactNode }) {
  return <View className="w-full flex-row items-center gap-3">{children}</View>;
}

/** `edPlayBtn`. */
export function StudyPlayButton({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  const ink = useStudyInk();
  const { t } = useLocale();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? t("learn.pause") : t("learn.play")}
      className="h-10 w-10 items-center justify-center rounded-full border active:opacity-80"
      style={{ borderColor: ink.border, backgroundColor: ink.mix(ink.teal, 16) }}
    >
      <Ionicons name={playing ? "pause" : "play"} size={16} color={ink.ink} />
    </Pressable>
  );
}

/** `edScrub` — the range input. */
export function StudyRange({
  min,
  max,
  step = 0,
  value,
  onChange,
  onSlidingComplete,
  disabled,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  onSlidingComplete?: (v: number) => void;
  disabled?: boolean;
}) {
  const ink = useStudyInk();
  return (
    <Slider
      style={{ flex: 1, height: 36 }}
      value={value}
      minimumValue={min}
      maximumValue={max}
      step={step}
      disabled={disabled}
      onValueChange={onChange}
      onSlidingComplete={onSlidingComplete}
      minimumTrackTintColor={ink.teal}
      maximumTrackTintColor={ink.mix(ink.teal, 25)}
      thumbTintColor={ink.isDark ? ink.gold : ink.teal}
    />
  );
}

/** `edPresets`. */
export function StudyPresetRow({ children }: { children: ReactNode }) {
  return <View className="w-full flex-row flex-wrap gap-1.5">{children}</View>;
}

/** `edPreset(active)`. */
export function StudyPresetButton({ active, onPress, children }: { active?: boolean; onPress: () => void; children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      className="h-8 justify-center rounded-full border px-3 active:opacity-80"
      style={active ? { borderColor: "transparent", backgroundColor: ink.isDark ? ink.gold : ink.teal } : { borderColor: ink.border }}
    >
      <Text
        className={cn("text-sm", active ? "font-bold" : "font-semibold")}
        style={[nepaliTextStyle(13), { color: active ? (ink.isDark ? neutral.black : neutral.white) : ink.dim }]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

/** The `.hl` / `.hl-amber` / `<b>` spans inside a caption. */
export function StudyHl({ amber, children }: { amber?: boolean; children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text className="font-semibold" style={{ color: amber ? ink.amber : ink.teal }}>
      {children}
    </Text>
  );
}

export function StudyB({ children }: { children: ReactNode }) {
  const ink = useStudyInk();
  return (
    <Text className="font-semibold" style={{ color: ink.ink }}>
      {children}
    </Text>
  );
}
