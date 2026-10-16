import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@vedic-patro/ui";
import { fontFamily, illustration, neutral, webTypeScale, withAlpha } from "@vedic-patro/design-tokens";
import { DAYLIGHT_STOPS } from "@vedic-patro/design-tokens/classes/learn/daylight-stops";
import { skySheetTransport, useSkyTimeSheet, type SkyTimeFieldView } from "@vedic-patro/features/sky3d";
import type { SkyTimeSheetProps } from "../contract";

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  timeRate,
  onClose,
  onApplyMs,
  onTimeRate,
  onTogglePlay,
  onResetRate,
  transport: transportProp,
  centered = false,
  icons,
}: SkyTimeSheetProps) {
  const v = useSkyTimeSheet({ timeMs, zoneOffsetMs, timeRate: timeRate ?? 0, onApplyMs });
  const transport = skySheetTransport({
    timeRate,
    onTimeRate,
    onTogglePlay,
    onResetRate,
    transport: transportProp,
    speedLabel: v.speedLabel,
    playing: v.playing,
  });

  const stepper = (f: SkyTimeFieldView) => (
    <View key={f.field} className="items-center" style={{ width: f.wide ? 52 : 36 }}>
      <Hold label={f.upLabel} onStep={f.up}>
        {icons.up}
      </Hold>
      {/* The website's field: semibold digits in the app font, committed when editing ends (return or blur). */}
      <TextInput
        value={f.value}
        accessibilityLabel={f.label}
        keyboardType={f.allowMinus ? "numbers-and-punctuation" : "number-pad"}
        returnKeyType="done"
        selectTextOnFocus
        selectionColor={neutral.white}
        onFocus={() => v.startEdit(f.field)}
        onChangeText={(raw) => v.setDraft(f.field, raw)}
        onEndEditing={(e) => v.commitField(f.field, e.nativeEvent.text)}
        style={{
          width: "100%",
          padding: 0,
          textAlign: "center",
          color: neutral.white,
          fontSize: webTypeScale.xl.size,
          lineHeight: webTypeScale.xl.lineHeight,
          fontFamily: fontFamily.native.semibold,
          fontVariant: ["tabular-nums"],
        }}
      />
      <Hold label={f.downLabel} onStep={f.down}>
        {icons.down}
      </Hold>
    </View>
  );

  const withSeps = (fields: SkyTimeFieldView[], glyph: string) =>
    fields.flatMap((f, i) =>
      i === 0
        ? [stepper(f)]
        : [
            <Text key={`sep-${f.field}`} className="w-2.5 text-center text-xl font-semibold text-white/80">
              {glyph}
            </Text>,
            stepper(f),
          ],
    );

  return (
    <View className={centered ? "absolute inset-0 items-center justify-center px-3" : "absolute inset-0 justify-end"}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={v.labels.close}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: withAlpha(neutral.black, 0.4) }}
      />
      <View
        className={centered ? "w-full rounded-3xl border border-white/10 px-4 pb-4 pt-2" : "w-full rounded-t-3xl border border-white/10 px-4 pb-4 pt-2"}
        style={{ maxWidth: 512, alignSelf: "center", backgroundColor: withAlpha(illustration.gray11, 0.88) }}
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/30" />
        <View className="flex-row items-center justify-center gap-3">
          <View className="flex-row items-center">{withSeps(v.dateFields, "/")}</View>
          <View className="flex-row items-center">{withSeps(v.clockFields, ":")}</View>
        </View>
        {transport ? (
          <>
            <Text className="mb-1 mt-4 text-center text-sm font-semibold text-white/90">{transport.label}</Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={transport.onTogglePlay}
                accessibilityRole="button"
                accessibilityLabel={transport.playing ? v.labels.pause : v.labels.play}
                className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
              >
                {transport.playing ? icons.pause : icons.play}
              </Pressable>
              <Scrub
                min={-transport.max}
                max={transport.max}
                step={1}
                value={transport.rung}
                onChange={transport.onRung}
                track={<View className="h-1 rounded-full" style={{ backgroundColor: withAlpha(neutral.white, 0.2) }} />}
                thumb={neutral.white}
              />
              <Pressable
                onPress={transport.onReset}
                accessibilityRole="button"
                accessibilityLabel={v.labels.realtime}
                className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
              >
                {icons.reset}
              </Pressable>
            </View>
          </>
        ) : null}
        <View className="mt-4 flex-row gap-2">
          {v.jumps.map((jump) => (
            <Pressable key={jump.id} onPress={jump.run} accessibilityRole="button" accessibilityLabel={jump.label} className="flex-1 items-center gap-1 rounded-xl py-2 active:opacity-60">
              {icons[jump.id]}
              <Text className="text-center text-xs font-medium text-white/90" numberOfLines={1}>
                {jump.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-4">
          <Scrub
            min={0}
            max={86_399}
            step={1}
            value={v.daySlider}
            onChange={v.setDaySlider}
            track={
              <View className="h-3.5 flex-row overflow-hidden rounded-full">
                {DAYLIGHT_STOPS.slice(0, -1).map((stop, index) => (
                  <View key={stop.at} style={{ flex: (DAYLIGHT_STOPS[index + 1]?.at ?? stop.at) - stop.at, backgroundColor: stop.color }} />
                ))}
              </View>
            }
            thumb={illustration.amber92}
          />
          <View className="relative mt-1.5 h-4">
            {v.dayPeriods.map((band) => {
              const edge = band.at <= 8 ? "left" : band.at >= 88 ? "right" : "center";
              return (
                <View
                  key={band.id}
                  className="absolute"
                  style={edge === "left" ? { left: 0 } : edge === "right" ? { right: 0 } : { left: `${band.at}%`, width: 96, marginLeft: -48, alignItems: "center" }}
                >
                  <Text numberOfLines={1} className={band.active ? "text-diagram-xs font-semibold text-white" : "text-diagram-xs font-medium text-white/55"}>{band.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function Scrub({
  min,
  max,
  step,
  value,
  onChange,
  track,
  thumb,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  track: ReactNode;
  thumb: string;
}) {
  const width = useRef(1);
  /* Where the press began, inside the track and on the screen. A move is read as
     a page-x delta from there: `locationX` is relative to whichever view is under
     the finger, so once it slid onto the thumb the value jumped and the drag stalled. */
  const startX = useRef(0);
  const startPageX = useRef(0);
  const place = (x: number) => {
    const span = Math.max(1, max - min);
    const raw = min + Math.min(1, Math.max(0, x / width.current)) * span;
    const stepped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, stepped)));
  };
  const left = `${((value - min) / Math.max(1, max - min)) * 100}%` as `${number}%`;
  return (
    <View
      className="h-8 flex-1 justify-center"
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width || 1;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      /* Keep the drag: a parent scroll view or the sheet must not take it over mid-swipe. */
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        startX.current = event.nativeEvent.locationX;
        startPageX.current = event.nativeEvent.pageX;
        place(startX.current);
      }}
      onResponderMove={(event) => place(startX.current + event.nativeEvent.pageX - startPageX.current)}
    >
      <View pointerEvents="none">
        {track}
      </View>
      <View
        pointerEvents="none"
        className="absolute h-5 w-5 rounded-full"
        style={{ left, marginLeft: -10, backgroundColor: thumb, borderWidth: 2, borderColor: withAlpha(neutral.black, 0.35) }}
      />
    </View>
  );
}

function Hold({ label, onStep, children }: { label: string; onStep: () => void; children: ReactNode }) {
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);
  const stop = () => {
    if (hold.current) clearTimeout(hold.current);
    if (repeat.current) clearInterval(repeat.current);
    hold.current = null;
    repeat.current = null;
  };
  // The sheet can close mid-hold; onPressOut never fires then, so the repeat would run on forever.
  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
      if (repeat.current) clearInterval(repeat.current);
    },
    [],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-6 w-full items-center justify-center active:opacity-60"
      onPressIn={() => {
        onStepRef.current();
        hold.current = setTimeout(() => {
          repeat.current = setInterval(() => onStepRef.current(), 70);
        }, 380);
      }}
      onPressOut={stop}
    >
      {children}
    </Pressable>
  );
}
