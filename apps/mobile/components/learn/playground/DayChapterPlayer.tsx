/**
 * Welcome overlay + chapter transport — the guided-tour chrome.
 *
 * One scrubber. One play button. Chapter title in the middle, times on the
 * sides, skip either side of play. The table of contents opens as a bottom
 * sheet rather than a dropdown — the syllabus runs to a dozen-odd chapters,
 * too many for a floating menu on a phone screen. The copy and the transport
 * logic are shared with the website (`useDayChapterBar` / `useDayChapterWelcome`).
 */

import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import Slider from "@react-native-community/slider";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Text } from "@/components/ui/Text";
import { useDayChapterBar, useDayChapterWelcome } from "@vedic-patro/features/learn";
import type { DayChapterPlayer } from "@/lib/learn/use-chapter-track";
import { nepaliTextStyle } from "@/lib/nepali-text";

import { brand, illustration, neutral, spaceUnit, withAlpha } from "@vedic-patro/design-tokens";
const GOLD = illustration.amber61;

const PLAY_NUDGE = 0.75 * spaceUnit;

export function DayChapterWelcome({ player }: { player: DayChapterPlayer }) {
  const w = useDayChapterWelcome(player);
  if (!w.visible) return null;
  return (
    <View className="absolute inset-0 z-20 items-center justify-center bg-black/55 px-6">
      <View className="max-w-md items-center">
        <Text
          className="text-caption font-semibold uppercase tracking-eyebrow-wide text-white/55"
          style={nepaliTextStyle(11)}
        >
          {w.eyebrow}
        </Text>
        <Text
          className="text-3xl mt-2 text-center font-semibold tracking-tight text-white"
          style={nepaliTextStyle(28)}
        >
          {w.title}
        </Text>
        <Text className="text-body mt-2 text-center text-white/70" style={nepaliTextStyle(14)}>
          {w.subtitle}
        </Text>
        <Pressable
          onPress={w.play}
          accessibilityRole="button"
          accessibilityLabel={w.begin}
          className="mt-6 h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white active:opacity-80"
        >
          <Ionicons name="play" size={28} color={neutral.black} style={{ marginLeft: PLAY_NUDGE }} />
        </Pressable>
        <Text
          className="text-caption mt-3 font-semibold uppercase tracking-eyebrow text-white/70"
          style={nepaliTextStyle(11)}
        >
          {w.begin}
        </Text>
        {w.playground ? (
          <Pressable onPress={w.playground.open} accessibilityRole="button" className="mt-4 active:opacity-70">
            <Text
              className="text-caption font-semibold uppercase tracking-eyebrow text-white/60 underline"
              style={nepaliTextStyle(11)}
            >
              {w.playground.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function DayChapterBar({
  player,
  orbitPlaying,
  onOrbitToggle,
}: {
  player: DayChapterPlayer;
  /** Playground: the year orbit, not a chapter clock. */
  orbitPlaying?: boolean;
  onOrbitToggle?: () => void;
}) {
  const bar = useDayChapterBar(player);
  const { scrub, toc, transport, free } = bar;
  const playing = free ? Boolean(orbitPlaying) : transport.playing;
  const ended = free ? false : transport.ended;
  const { isFirst, isLast } = transport;

  return (
    <View>
      {free ? null : (
        <View>
          <Slider
            style={{ width: "100%", height: 28 }}
            value={scrub.value}
            minimumValue={0}
            maximumValue={scrub.max}
            step={scrub.step}
            onValueChange={scrub.seek}
            minimumTrackTintColor={GOLD}
            maximumTrackTintColor={withAlpha(neutral.white, 0.25)}
            thumbTintColor={GOLD}
            accessibilityLabel={scrub.label}
          />
          <View className="-mt-1 flex-row items-center justify-between">
            <Text className="text-caption font-num text-white/45">{scrub.time}</Text>
            <Text className="text-caption font-num text-white/45">{scrub.duration}</Text>
          </View>
        </View>
      )}

      <View className="mt-1 items-center">
        <Pressable
          onPress={() => toc.setOpen(true)}
          className="max-w-full flex-row items-center gap-1.5 px-2 py-1 active:opacity-70"
        >
          <Text className="text-body max-w-[220px] font-semibold text-white/90" numberOfLines={1} style={nepaliTextStyle(13)}>
            {bar.heading}
          </Text>
          <Ionicons name="chevron-up" size={14} color={withAlpha(neutral.white, 0.5)} />
        </Pressable>
      </View>

      <View className="mt-1 flex-row items-center justify-center gap-5">
        <Pressable
          disabled={isFirst}
          onPress={transport.prev}
          accessibilityRole="button"
          accessibilityLabel={transport.prevLabel}
          className="h-10 w-10 items-center justify-center active:opacity-70"
          style={isFirst ? { opacity: 0.3 } : undefined}
        >
          <Ionicons name="play-skip-back" size={22} color={neutral.white} />
        </Pressable>
        <Pressable
          onPress={free ? onOrbitToggle : transport.primary}
          accessibilityRole="button"
          accessibilityLabel={
            free ? (playing ? transport.pauseLabel : transport.playLabel) : transport.primaryLabel
          }
          className="h-12 w-12 items-center justify-center active:opacity-70"
        >
          <Ionicons
            name={ended ? "refresh" : playing ? "pause" : "play"}
            size={ended ? 26 : 28}
            color={neutral.white}
            style={!ended && !playing ? { marginLeft: PLAY_NUDGE } : undefined}
          />
        </Pressable>
        <Pressable
          disabled={isLast}
          onPress={transport.next}
          accessibilityRole="button"
          accessibilityLabel={transport.nextLabel}
          className="h-10 w-10 items-center justify-center active:opacity-70"
          style={isLast ? { opacity: 0.3 } : undefined}
        >
          <Ionicons name="play-skip-forward" size={22} color={transport.nextHighlighted ? illustration.amber77 : neutral.white} />
        </Pressable>
        {/* Live in every chapter, not only once the script hands off: a reader
            who pauses mid-narration and wants to nudge the animation themselves
            needs it the whole time. Pressing it pauses narration and hands the
            clock to the reader. */}
        {free || !onOrbitToggle ? null : (
          <Pressable
            onPress={onOrbitToggle}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(orbitPlaying) }}
            accessibilityLabel={orbitPlaying ? bar.orbitLabels.pause : bar.orbitLabels.run}
            className="h-10 w-10 items-center justify-center active:opacity-70"
          >
            <Ionicons
              name={orbitPlaying ? "planet" : "planet-outline"}
              size={22}
              color={orbitPlaying ? illustration.amber77 : neutral.white}
            />
          </Pressable>
        )}
      </View>

      <BottomSheetModal
        visible={toc.open}
        onClose={() => toc.setOpen(false)}
        variant="bottom"
        maxHeight="70%"
        sheetStyle={{ backgroundColor: brand.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <View className="max-h-full">
          <View className="border-b border-white/10 px-4 py-3">
            <Text className="text-sm font-semibold text-white">{toc.title}</Text>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="py-1">
            {toc.parts.map((part) => (
              <View key={part.key}>
                {part.label ? (
                  <Text
                    className="text-caption px-4 pb-0.5 pt-2.5 font-semibold uppercase tracking-eyebrow text-white/35"
                    style={nepaliTextStyle(10)}
                  >
                    {part.label}
                  </Text>
                ) : null}
                {part.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={item.select}
                    className="flex-row items-center gap-2 px-4 py-2 active:opacity-70"
                    style={item.active ? { backgroundColor: withAlpha(neutral.white, 0.12) } : undefined}
                  >
                    <Text className="text-caption font-num w-6 shrink-0 text-white/40">{item.number}</Text>
                    <Text
                      className="text-body flex-1 font-semibold"
                      style={{ color: item.active ? neutral.white : withAlpha(neutral.white, 0.7), ...nepaliTextStyle(13) }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </BottomSheetModal>
    </View>
  );
}
