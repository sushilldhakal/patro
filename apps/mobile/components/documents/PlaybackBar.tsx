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

  const shell = (children: React.ReactNode) => (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 12, right: 12, bottom, alignItems: "center" }}
    >
      <View
        className="w-full max-w-2xl rounded-2xl border border-border bg-card px-3 py-2.5"
        style={{ elevation: 6, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}
      >
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
        className="flex-row items-center gap-3"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Ionicons name="play" size={20} color={inkOn(colors.secondary)} style={{ marginLeft: 2 }} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body font-semibold" numberOfLines={1}>
            {t(full.available ? "documents.play_full_recording" : "documents.play_through")}
          </Text>
          <Text className="text-caption text-muted-foreground" numberOfLines={1}>
            {documentTitle}
          </Text>
        </View>
        <Ionicons name="headset-outline" size={18} color={colors.mutedForeground} />
      </Pressable>,
    );
  }

  if (mode === "full") {
    return shell(
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={audio.toggleFull}
          accessibilityRole="button"
          accessibilityLabel={t(full.playing ? "documents.pause_verse" : "documents.play_full_recording")}
          className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
        >
          <Ionicons name={full.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={full.playing ? undefined : { marginLeft: 2 }} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-caption font-semibold text-muted-foreground" numberOfLines={1}>
            {t("documents.play_full_recording")}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-caption w-9 text-muted-foreground">{formatTime(full.currentTime)}</Text>
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
            <Text className="text-caption w-9 text-right text-muted-foreground">{formatTime(full.duration)}</Text>
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
        <View className="mb-1.5 flex-row items-center gap-2">
          <Text className="text-caption w-9 text-right text-muted-foreground">{formatTime(verse.currentTime)}</Text>
          <View className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <View
              className="h-full bg-secondary"
              style={{ width: `${verse.duration > 0 ? Math.min(100, (verse.currentTime / verse.duration) * 100) : 0}%` }}
            />
          </View>
          <Text className="text-caption w-9 text-muted-foreground">{formatTime(verse.duration)}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={audio.prevVerse}
          disabled={!audio.hasPrev}
          accessibilityRole="button"
          accessibilityLabel={t("documents.prev_verse")}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center"
          style={{ opacity: audio.hasPrev ? 1 : 0.3 }}
        >
          <Ionicons name="play-skip-back" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={() => audio.toggleVerse(activeShloka.id)}
          disabled={!activeShloka.audio_url}
          accessibilityRole="button"
          accessibilityLabel={t(verse.playing ? "documents.pause_verse" : "documents.play_verse")}
          className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          style={{ opacity: activeShloka.audio_url ? 1 : 0.4 }}
        >
          <Ionicons name={verse.playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} style={verse.playing ? undefined : { marginLeft: 2 }} />
        </Pressable>
        <Pressable
          onPress={audio.nextVerse}
          disabled={!audio.hasNext}
          accessibilityRole="button"
          accessibilityLabel={t("documents.next_verse")}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center"
          style={{ opacity: audio.hasNext ? 1 : 0.3 }}
        >
          <Ionicons name="play-skip-forward" size={18} color={colors.mutedForeground} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-caption font-semibold text-muted-foreground" numberOfLines={1}>
            {documentTitle}
          </Text>
          <Text className="text-body font-semibold" numberOfLines={1}>
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
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="musical-notes-outline" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>,
  );
}
