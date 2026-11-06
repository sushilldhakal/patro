import { useEffect } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { setBarAccessoryHeight } from "@/lib/bar-accessory";
import { closeDocumentAudio, useAudioEngine, useAudioSession } from "@/lib/documents/document-audio-session";
import { useLocale } from "@/lib/i18n";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/** The bar's side gutter, the same as the floating bottom bar's and the document page's player. */
const GUTTER = 16;

/**
 * The mini player: a document's recording keeps playing on every other page, with play / pause, a tap
 * back to the text and an X to stop it — like a music app's mini player. Hidden on the page the
 * recording belongs to (that page shows its full bar) and once the player is closed.
 */
export function GlobalAudioBar() {
  const session = useAudioSession();
  const engine = useAudioEngine();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const colors = useThemeColors();
  const { t, digits } = useLocale();

  const audio = engine && session && engine.key === session.key ? engine.audio : null;
  const visible = Boolean(audio && session && audio.mode != null && pathname !== session.route);

  useEffect(() => {
    if (!visible) setBarAccessoryHeight(0);
    return () => setBarAccessoryHeight(0);
  }, [visible]);

  if (!visible || !audio || !session) return null;

  const full = audio.mode === "full";
  const playing = full ? audio.full.playing : audio.verse.playing;
  const progress = full ? (audio.full.duration > 0 ? audio.full.currentTime / audio.full.duration : 0) : audio.activeProgress;
  const title =
    !full && audio.activeShloka
      ? t("documents.now_playing", { label: audio.activeShloka.verse_label ?? digits(audio.activeShloka.verse_number) })
      : audio.suktaNumber != null
        ? t("documents.sukta_label", { number: digits(audio.suktaNumber) })
        : (session.chapterTitle ?? session.documentTitle ?? "");
  const subtitle = session.documentTitle && session.documentTitle !== title ? session.documentTitle : undefined;

  const toggle = () => {
    haptics.tick();
    if (full) audio.toggleFull();
    else if (audio.activeShloka) audio.toggleVerse(audio.activeShloka.id);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: GUTTER, right: GUTTER, bottom: floatingNavTabBarHeight(isTablet, insets.bottom) + 8, alignItems: "center" }}
      onLayout={(e: LayoutChangeEvent) => setBarAccessoryHeight(e.nativeEvent.layout.height + 8)}
    >
      <View
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row items-center gap-3 py-2 pl-2 pr-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t("documents.pause_verse") : t("documents.resume")}
            onPress={toggle}
            hitSlop={6}
            className="h-11 w-11 items-center justify-center rounded-full bg-secondary active:opacity-80"
          >
            <Ionicons name={playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint={t("documents.open_player")}
            onPress={() => router.push(session.route as never)}
            className="min-w-0 flex-1 py-1 active:opacity-70"
          >
            <Text numberOfLines={1} className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} className="text-caption text-muted-foreground">{subtitle}</Text> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("documents.close_player")}
            onPress={() => {
              haptics.tick();
              closeDocumentAudio();
            }}
            hitSlop={6}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {/* How far through the recording or the verse. */}
        <View className="h-0.5 w-full bg-muted">
          <View className="h-full bg-secondary" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </View>
      </View>
    </View>
  );
}
