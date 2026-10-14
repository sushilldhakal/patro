import { Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { usePlaybackBar } from "@vedic-patro/features/documents";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

import { space } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
/**
 * One floating transport bar per document — plays either the single full
 * recording or one verse's clip. `mode === null` shows a single start button.
 */
export function PlaybackBar({ audio, documentTitle }: { audio: DocumentAudio; documentTitle: string }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const bottom = floatingNavTabBarHeight(isTablet, insets.bottom) + 8;
  const { activeShloka } = audio;
  const bar = usePlaybackBar({
    mode: audio.mode,
    hasFullRecording: audio.full.available,
    canPlayThrough: audio.hasVerseClips,
    full: audio.full,
    verse: audio.verse,
    activeShloka,
  });
  const { copy, full, verse } = bar;

  const shell = (children: React.ReactNode, pad: string = documentsClasses.barPad) => (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 12, right: 12, bottom, alignItems: "center" }}
    >
      <View className={cn(documentsClasses.barShell, pad)}>
        {children}
      </View>
    </View>
  );

  if (bar.face === "hidden") return null;

  if (bar.face === "idle") {
    return shell(
      <Pressable
        onPress={bar.idle.startsFull ? audio.startFull : audio.startPlayThrough}
        accessibilityRole="button"
        className={documentsClasses.barRow}
      >
        <View className={documentsClasses.barPlay}>
          <Ionicons name="play" size={20} color={inkOn(colors.secondary)} style={{ marginLeft: space.hair }} />
        </View>
        <View className={documentsClasses.fill}>
          <Text className={documentsClasses.barTitle} numberOfLines={1}>
            {bar.idle.title}
          </Text>
          <Text className={documentsClasses.barSubtitle} numberOfLines={1}>
            {documentTitle}
          </Text>
        </View>
        <Ionicons name="headset-outline" size={16} color={colors.mutedForeground} />
      </Pressable>,
      documentsClasses.barPadIdle,
    );
  }

  if (bar.face === "full") {
    return shell(
      <View className={documentsClasses.barRow}>
        <Pressable
          onPress={audio.toggleFull}
          accessibilityRole="button"
          accessibilityLabel={full.toggleLabel}
          className={documentsClasses.barPlay}
        >
          <Ionicons name={full.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={full.playing ? undefined : { marginLeft: space.hair }} />
        </Pressable>
        <View className={documentsClasses.fill}>
          <Text className={documentsClasses.barKicker} numberOfLines={1}>
            {copy.playFull}
          </Text>
          <View className={documentsClasses.barScrubRow}>
            <Text className={documentsClasses.barTime}>{full.current}</Text>
            <Slider
              style={{ flex: 1, height: 28 }}
              minimumValue={0}
              maximumValue={audio.full.duration || 1}
              value={audio.full.currentTime}
              onSlidingComplete={audio.seekFull}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.secondary}
              accessibilityLabel={copy.seek}
            />
            <Text className={cn(documentsClasses.barTime, "text-right")}>{full.total}</Text>
          </View>
        </View>
      </View>,
    );
  }

  if (!activeShloka) return null;

  return shell(
    <View>
      {verse.hasClip ? (
        <View className={cn(documentsClasses.barScrubRow, "mt-0 mb-1.5")}>
          <Text className={cn(documentsClasses.barTime, "text-right")}>{verse.current}</Text>
          <View className={documentsClasses.barTrack}>
            <View
              className={documentsClasses.barTrackFill}
              style={{ width: `${verse.fillPct}%` }}
            />
          </View>
          <Text className={documentsClasses.barTime}>{verse.total}</Text>
        </View>
      ) : null}
      <View className={documentsClasses.barRow}>
        <Pressable
          onPress={audio.prevVerse}
          disabled={!audio.hasPrev}
          accessibilityRole="button"
          accessibilityLabel={copy.prevVerse}
          hitSlop={6}
          className={documentsClasses.barSkip}
          style={{ opacity: audio.hasPrev ? 1 : 0.3 }}
        >
          <Ionicons name="play-skip-back" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={() => audio.toggleVerse(activeShloka.id)}
          disabled={!verse.hasClip}
          accessibilityRole="button"
          accessibilityLabel={verse.toggleLabel}
          className={documentsClasses.barPlay}
          style={{ opacity: verse.hasClip ? 1 : 0.4 }}
        >
          <Ionicons name={verse.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={verse.playing ? undefined : { marginLeft: space.hair }} />
        </Pressable>
        <Pressable
          onPress={audio.nextVerse}
          disabled={!audio.hasNext}
          accessibilityRole="button"
          accessibilityLabel={copy.nextVerse}
          hitSlop={6}
          className={documentsClasses.barSkip}
          style={{ opacity: audio.hasNext ? 1 : 0.3 }}
        >
          <Ionicons name="play-skip-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
        <View className={documentsClasses.fill}>
          <Text className={documentsClasses.barKicker} numberOfLines={1}>
            {documentTitle}
          </Text>
          <Text className={documentsClasses.barTitle} numberOfLines={1}>
            {verse.title}
          </Text>
        </View>
        {verse.canSwitchToFull ? (
          <Pressable
            onPress={audio.switchToFull}
            accessibilityRole="button"
            accessibilityLabel={copy.switchToFull}
            hitSlop={6}
            className={documentsClasses.barSkip}
          >
            <Ionicons name="musical-notes-outline" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>,
  );
}
