import { useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useDayChapterBar, useDayChapterWelcome } from "@vedic-patro/features/learn";
import { Text } from "@vedic-patro/ui";
import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import type { DayChapterBarProps, DayChapterWelcomeProps } from "../contract";

export function DayChapterWelcome({ player, playIcon }: DayChapterWelcomeProps) {
  const w = useDayChapterWelcome(player);
  if (!w.visible) return null;
  return (
    <View className="absolute inset-0 z-20 items-center justify-center bg-black/55 px-6">
      <View className="max-w-md items-center">
        <Text className="text-center text-xs font-semibold uppercase tracking-eyebrow-wide text-white/55">{w.eyebrow}</Text>
        <Text className="mt-2 text-center text-3xl font-semibold tracking-tight text-white">{w.title}</Text>
        <Text className="mt-2 text-center text-sm text-white/70">{w.subtitle}</Text>
        <Pressable
          onPress={w.play}
          accessibilityRole="button"
          accessibilityLabel={w.begin}
          className="mt-6 h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white active:opacity-80"
        >
          {playIcon}
        </Pressable>
        <Text className="mt-3 text-center text-xs font-semibold uppercase tracking-eyebrow-wide text-white/70">{w.begin}</Text>
        {w.playground ? (
          <Pressable onPress={w.playground.open} accessibilityRole="button" className="mt-4 active:opacity-70">
            <Text className="text-center text-xs font-semibold uppercase tracking-eyebrow-wide text-white/60 underline">{w.playground.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function DayChapterBar({ player, icons, orbitPlaying, onOrbitToggle }: DayChapterBarProps) {
  const bar = useDayChapterBar(player);
  const { scrub, toc, transport, volume, free } = bar;
  const playing = free ? Boolean(orbitPlaying) : transport.playing;
  const ended = free ? false : transport.ended;
  const showTransport = !free || Boolean(onOrbitToggle);

  return (
    <View>
      {free ? null : (
        <View>
          <Scrub min={0} max={scrub.max} step={scrub.step} value={scrub.value} onChange={scrub.seek} label={scrub.label} />
          <View className="-mt-1 flex-row items-center justify-between">
            <Text className="font-num text-xs text-white/45">{scrub.time}</Text>
            <Text className="font-num text-xs text-white/45">{scrub.duration}</Text>
          </View>
        </View>
      )}

      <View className="mt-1 items-center">
        <Pressable onPress={() => toc.setOpen(true)} className="max-w-full flex-row items-center gap-1.5 px-2 py-1 active:opacity-70">
          <Text className="max-w-[220px] text-sm font-semibold text-white/90" numberOfLines={1}>
            {bar.heading}
          </Text>
          {icons.chevron}
        </Pressable>
      </View>

      {showTransport ? (
        <View className="mt-1 flex-row items-center justify-center gap-5">
          <Pressable
            disabled={transport.isFirst}
            onPress={transport.prev}
            accessibilityRole="button"
            accessibilityLabel={transport.prevLabel}
            className="h-10 w-10 items-center justify-center active:opacity-70"
            style={transport.isFirst ? { opacity: 0.3 } : undefined}
          >
            {icons.prev}
          </Pressable>
          <Pressable
            onPress={free ? onOrbitToggle : transport.primary}
            accessibilityRole="button"
            accessibilityLabel={free ? (playing ? transport.pauseLabel : transport.playLabel) : transport.primaryLabel}
            className="h-12 w-12 items-center justify-center active:opacity-70"
          >
            {ended ? icons.replay : playing ? icons.pause : icons.play}
          </Pressable>
          <Pressable
            disabled={transport.isLast}
            onPress={transport.next}
            accessibilityRole="button"
            accessibilityLabel={transport.nextLabel}
            className="h-10 w-10 items-center justify-center active:opacity-70"
            style={transport.isLast ? { opacity: 0.3 } : undefined}
          >
            {icons.next}
          </Pressable>
          {!free && onOrbitToggle ? (
            <Pressable
              onPress={onOrbitToggle}
              accessibilityRole="button"
              accessibilityState={{ selected: Boolean(orbitPlaying) }}
              accessibilityLabel={orbitPlaying ? bar.orbitLabels.pause : bar.orbitLabels.run}
              className="h-10 w-10 items-center justify-center active:opacity-70"
            >
              {icons.orbit}
            </Pressable>
          ) : null}
          {free ? null : (
            <Pressable
              onPress={() => volume.setOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={volume.label}
              className="h-9 w-9 items-center justify-center active:opacity-70"
            >
              {icons.volume(volume.level)}
            </Pressable>
          )}
        </View>
      ) : null}

      {volume.open && !free ? (
        <View className="mt-2 flex-row items-center gap-3">
          <Pressable onPress={volume.toggleMute} accessibilityRole="button" accessibilityLabel={volume.label}>
            {icons.volume(volume.level)}
          </Pressable>
          <Scrub min={0} max={1} step={0.01} value={volume.value} onChange={volume.set} label={volume.label} />
        </View>
      ) : null}

      {toc.open ? (
        <View className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] rounded-t-2xl border-t border-white/15 bg-black/95">
          <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
            <Text className="text-sm font-semibold text-white">{toc.title}</Text>
            <Pressable onPress={() => toc.setOpen(false)} accessibilityRole="button" accessibilityLabel={toc.closeLabel} className="h-7 w-7 items-center justify-center">
              {icons.close}
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="py-1">
            {toc.parts.map((part) => (
              <View key={part.key}>
                {part.label ? (
                  <Text className="px-4 pb-1 pt-3 text-diagram-xs font-semibold uppercase tracking-eyebrow-wide text-white/35">{part.label}</Text>
                ) : null}
                {part.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={item.select}
                    className="flex-row items-center gap-2 px-4 py-2.5 active:opacity-70"
                    style={item.active ? { backgroundColor: withAlpha(neutral.white, 0.15) } : undefined}
                  >
                    <Text className="w-5 font-num text-sm text-white/40">{item.number}</Text>
                    <Text className={item.active ? "flex-1 text-sm font-semibold text-white" : "flex-1 text-sm font-semibold text-white/70"} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function Scrub({
  min,
  max,
  step,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const width = useRef(1);
  const place = (x: number) => {
    const span = Math.max(step, max - min);
    const raw = min + Math.min(1, Math.max(0, x / width.current)) * span;
    const stepped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, stepped)));
  };
  const left = `${((value - min) / Math.max(step, max - min)) * 100}%` as `${number}%`;
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      className="h-7 justify-center"
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width || 1;
      }}
      onPress={(event) => place(event.nativeEvent.locationX)}
    >
      <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(neutral.white, 0.25) }}>
        <View className="h-full" style={{ width: left, backgroundColor: illustration.amber61 }} />
      </View>
    </Pressable>
  );
}
