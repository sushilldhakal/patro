import { Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { useLocale, useTranslation } from "@/lib/i18n";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

import { space } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  return `${m}:${String(total - m * 60).padStart(2, "0")}`;
}

/**
 * One floating transport bar per document — plays either the single full
 * recording or one verse's clip. `mode === null` shows a single start button.
 */
export function PlaybackBar({ audio, documentTitle }: { audio: DocumentAudio; documentTitle: string }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const bottom = floatingNavTabBarHeight(isTablet, insets.bottom) + 8;
  const { mode, full, verse, activeShloka } = audio;

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

  if (mode == null) {
    if (!full.available && !audio.hasVerseClips) return null;
    return shell(
      <Pressable
        onPress={full.available ? audio.startFull : audio.startPlayThrough}
        accessibilityRole="button"
        className={documentsClasses.barRow}
      >
        <View className={documentsClasses.barPlay}>
          <Ionicons name="play" size={20} color={inkOn(colors.secondary)} style={{ marginLeft: space.hair }} />
        </View>
        <View className={documentsClasses.fill}>
          <Text className={documentsClasses.barTitle} numberOfLines={1}>
            {t(full.available ? "documents.play_full_recording" : "documents.play_through")}
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

  if (mode === "full") {
    return shell(
      <View className={documentsClasses.barRow}>
        <Pressable
          onPress={audio.toggleFull}
          accessibilityRole="button"
          accessibilityLabel={t(full.playing ? "documents.pause_verse" : "documents.play_full_recording")}
          className={documentsClasses.barPlay}
        >
          <Ionicons name={full.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={full.playing ? undefined : { marginLeft: space.hair }} />
        </Pressable>
        <View className={documentsClasses.fill}>
          <Text className={documentsClasses.barKicker} numberOfLines={1}>
            {t("documents.play_full_recording")}
          </Text>
          <View className={documentsClasses.barScrubRow}>
            <Text className={documentsClasses.barTime}>{formatTime(full.currentTime)}</Text>
            <Slider
              style={{ flex: 1, height: 28 }}
              minimumValue={0}
              maximumValue={full.duration || 1}
              value={full.currentTime}
              onSlidingComplete={audio.seekFull}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.secondary}
              accessibilityLabel={t("documents.seek")}
            />
            <Text className={cn(documentsClasses.barTime, "text-right")}>{formatTime(full.duration)}</Text>
          </View>
        </View>
      </View>,
    );
  }

  if (!activeShloka) return null;
  const canSwitchToFull = full.available && activeShloka.full_audio_start != null;
  const meaning =
    lang === "ne"
      ? activeShloka.meaning_ne || activeShloka.meaning_en
      : activeShloka.meaning_en || activeShloka.meaning_ne;

  return shell(
    <View>
      {activeShloka.audio_url ? (
        <View className={cn(documentsClasses.barScrubRow, "mt-0 mb-1.5")}>
          <Text className={cn(documentsClasses.barTime, "text-right")}>{formatTime(verse.currentTime)}</Text>
          <View className={documentsClasses.barTrack}>
            <View
              className={documentsClasses.barTrackFill}
              style={{ width: `${verse.duration > 0 ? Math.min(100, (verse.currentTime / verse.duration) * 100) : 0}%` }}
            />
          </View>
          <Text className={documentsClasses.barTime}>{formatTime(verse.duration)}</Text>
        </View>
      ) : null}
      <View className={documentsClasses.barRow}>
        <Pressable
          onPress={audio.prevVerse}
          disabled={!audio.hasPrev}
          accessibilityRole="button"
          accessibilityLabel={t("documents.prev_verse")}
          hitSlop={6}
          className={documentsClasses.barSkip}
          style={{ opacity: audio.hasPrev ? 1 : 0.3 }}
        >
          <Ionicons name="play-skip-back" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={() => audio.toggleVerse(activeShloka.id)}
          disabled={!activeShloka.audio_url}
          accessibilityRole="button"
          accessibilityLabel={t(verse.playing ? "documents.pause_verse" : "documents.play_verse")}
          className={documentsClasses.barPlay}
          style={{ opacity: activeShloka.audio_url ? 1 : 0.4 }}
        >
          <Ionicons name={verse.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={verse.playing ? undefined : { marginLeft: space.hair }} />
        </Pressable>
        <Pressable
          onPress={audio.nextVerse}
          disabled={!audio.hasNext}
          accessibilityRole="button"
          accessibilityLabel={t("documents.next_verse")}
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
            {t("documents.now_playing", { label: activeShloka.verse_label })}
            {meaning ? ` — ${meaning}` : ""}
          </Text>
        </View>
        {canSwitchToFull ? (
          <Pressable
            onPress={audio.switchToFull}
            accessibilityRole="button"
            accessibilityLabel={t("documents.switch_to_full")}
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
