/**
 * Welcome overlay + chapter transport — the guided-tour chrome.
 *
 * One scrubber. One play button. Chapter title in the middle, times on the
 * sides, skip either side of play. The table of contents opens as a bottom
 * sheet rather than a dropdown — the syllabus runs to a dozen-odd chapters,
 * too many for a floating menu on a phone screen.
 */

import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Text } from "@/components/ui/Text";
import { formatChapterClock } from "@/lib/learn/chapter-player";
import { chapterParts } from "@/lib/learn/chapter-tracks";
import { chapterLabel } from "@/lib/learn/chapter-labels";
import type { DayChapterPlayer } from "@/lib/learn/use-chapter-track";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

const GOLD = "#f4c542";

export function DayChapterWelcome({ player }: { player: DayChapterPlayer }) {
  const { lang, pick } = useLocale();
  if (!player.showWelcome) return null;
  return (
    <View className="absolute inset-0 z-20 items-center justify-center bg-black/55 px-6">
      <View className="max-w-md items-center">
        <Text
          className="text-xs font-semibold uppercase tracking-[2px] text-white/55"
          style={nepaliTextStyle(11)}
        >
          {chapterLabel("eyebrow", lang)}
        </Text>
        <Text
          className="mt-2 text-center text-3xl font-semibold tracking-tight text-white"
          style={nepaliTextStyle(28)}
        >
          {chapterLabel(player.track.titleKey, lang)}
        </Text>
        <Text className="mt-2 text-center text-sm text-white/70" style={nepaliTextStyle(14)}>
          {chapterLabel(player.track.subtitleKey, lang)}
        </Text>
        <Pressable
          onPress={player.play}
          accessibilityRole="button"
          accessibilityLabel={chapterLabel("begin", lang)}
          className="mt-6 h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white active:opacity-80"
        >
          <Ionicons name="play" size={28} color="#000" style={{ marginLeft: 3 }} />
        </Pressable>
        <Text
          className="mt-3 text-xs font-semibold uppercase tracking-[1.5px] text-white/70"
          style={nepaliTextStyle(11)}
        >
          {chapterLabel("begin", lang)}
        </Text>
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
  const { lang, digits } = useLocale();
  const [tocOpen, setTocOpen] = useState(false);

  const parts = useMemo(() => chapterParts(player.chapters), [player.chapters]);
  const free = Boolean(player.chapter.free);
  const isLast = player.index >= player.chapters.length - 1;
  const isFirst = player.index <= 0;
  const playing = free ? Boolean(orbitPlaying) : player.playing;
  const ended = free ? false : player.ended;

  return (
    <View>
      {free ? null : (
        <View>
          <Slider
            style={{ width: "100%", height: 28 }}
            value={player.time}
            minimumValue={0}
            maximumValue={player.duration || 1}
            step={50}
            onValueChange={player.seek}
            minimumTrackTintColor={GOLD}
            maximumTrackTintColor="rgba(255,255,255,0.25)"
            thumbTintColor={GOLD}
          />
          <View className="-mt-1 flex-row items-center justify-between">
            <Text className="font-num text-xs text-white/45">{digits(formatChapterClock(player.time))}</Text>
            <Text className="font-num text-xs text-white/45">{digits(formatChapterClock(player.duration))}</Text>
          </View>
        </View>
      )}

      <View className="mt-1 items-center">
        <Pressable
          onPress={() => setTocOpen(true)}
          className="max-w-full flex-row items-center gap-1.5 px-2 py-1 active:opacity-70"
        >
          <Text className="max-w-[220px] text-sm font-semibold text-white/90" numberOfLines={1} style={nepaliTextStyle(13)}>
            {chapterLabel("chapter", lang)} {digits(player.index + 1)}: {chapterLabel(player.chapter.titleKey, lang)}
          </Text>
          <Ionicons name="chevron-up" size={14} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      <View className="mt-1 flex-row items-center justify-center gap-5">
        <Pressable
          disabled={isFirst}
          onPress={player.prev}
          accessibilityRole="button"
          accessibilityLabel={chapterLabel("prev", lang)}
          className="h-10 w-10 items-center justify-center active:opacity-70"
          style={isFirst ? { opacity: 0.3 } : undefined}
        >
          <Ionicons name="play-skip-back" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={free ? onOrbitToggle : ended ? () => { player.seek(0); player.play(); } : player.toggle}
          accessibilityRole="button"
          accessibilityLabel={
            ended ? chapterLabel("replay", lang) : playing ? (lang === "en" ? "Pause" : "रोक्नुहोस्") : (lang === "en" ? "Play" : "चलाउनुहोस्")
          }
          className="h-12 w-12 items-center justify-center active:opacity-70"
        >
          <Ionicons
            name={ended ? "refresh" : playing ? "pause" : "play"}
            size={ended ? 26 : 28}
            color="#fff"
            style={!ended && !playing ? { marginLeft: 3 } : undefined}
          />
        </Pressable>
        <Pressable
          disabled={isLast}
          onPress={player.next}
          accessibilityRole="button"
          accessibilityLabel={chapterLabel("next", lang)}
          className="h-10 w-10 items-center justify-center active:opacity-70"
          style={isLast ? { opacity: 0.3 } : undefined}
        >
          <Ionicons name="play-skip-forward" size={22} color={player.ended && !isLast ? "#fde68a" : "#fff"} />
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
            accessibilityLabel={
              orbitPlaying ? (lang === "en" ? "Pause orbit" : "कक्ष रोक्नुहोस्") : (lang === "en" ? "Run orbit" : "कक्ष चलाउनुहोस्")
            }
            className="h-10 w-10 items-center justify-center active:opacity-70"
          >
            <Ionicons
              name={orbitPlaying ? "planet" : "planet-outline"}
              size={22}
              color={orbitPlaying ? "#fde68a" : "#fff"}
            />
          </Pressable>
        )}
      </View>

      <BottomSheetModal
        visible={tocOpen}
        onClose={() => setTocOpen(false)}
        variant="bottom"
        maxHeight="70%"
        sheetStyle={{ backgroundColor: "#151515", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <View className="max-h-full">
          <View className="border-b border-white/10 px-4 py-3">
            <Text className="text-sm font-semibold text-white">{chapterLabel("chapter", lang)}</Text>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingVertical: 4 }}>
            {parts.map((part, pi) => (
              <View key={part.partKey ?? `p-${pi}`}>
                {part.partKey ? (
                  <Text
                    className="px-4 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-white/35"
                    style={nepaliTextStyle(10)}
                  >
                    {chapterLabel(part.partKey, lang)}
                  </Text>
                ) : null}
                {part.items.map(({ chapter, index }) => (
                  <Pressable
                    key={chapter.id}
                    onPress={() => {
                      player.goTo(index);
                      setTocOpen(false);
                    }}
                    className="flex-row items-center gap-2 px-4 py-2 active:opacity-70"
                    style={index === player.index ? { backgroundColor: "rgba(255,255,255,0.12)" } : undefined}
                  >
                    <Text className="font-num w-6 shrink-0 text-xs text-white/40">{digits(index + 1)}</Text>
                    <Text
                      className="flex-1 text-sm font-semibold"
                      style={{ color: index === player.index ? "#fff" : "rgba(255,255,255,0.7)", ...nepaliTextStyle(13) }}
                      numberOfLines={1}
                    >
                      {chapterLabel(chapter.titleKey, lang)}
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
