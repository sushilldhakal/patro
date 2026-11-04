import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { setBarAccessoryHeight } from "@/lib/bar-accessory";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { PlaybackBar as Shared } from "@vedic-patro/ui/kit/jyotish";

/** The floating bar's own side gutter (FloatingNavBar), so the player lines up with it. */
const BAR_GUTTER = 16;

/** Binds the shared transport to the app audio engine and the native slider. */
export function PlaybackBar({ audio, documentTitle }: { audio: DocumentAudio; documentTitle: string }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const { activeShloka } = audio;
  return (
    <Shared
      mode={audio.mode}
      hasFullRecording={audio.full.available}
      hasSuktaAudio={audio.hasSuktaAudio}
      suktaNumber={audio.suktaNumber}
      documentTitle={documentTitle}
      onStartFull={audio.startFull}
      // No start button when only some verses are recorded: it would jump far ahead to the first one.
      onPlayThrough={audio.canPlayThrough ? audio.startPlayThrough : undefined}
      fullPlaying={audio.full.playing}
      fullCurrentTime={audio.full.currentTime}
      fullDuration={audio.full.duration}
      onToggleFull={audio.toggleFull}
      onSeekFull={audio.seekFull}
      activeShloka={activeShloka}
      versePlaying={audio.verse.playing}
      verseCurrentTime={audio.verse.currentTime}
      verseDuration={audio.verse.duration}
      hasNext={audio.hasNext}
      hasPrev={audio.hasPrev}
      onToggleVerse={() => activeShloka && audio.toggleVerse(activeShloka.id)}
      onNext={audio.nextVerse}
      onPrev={audio.prevVerse}
      onSwitchToFull={audio.switchToFull}
      dockBottom={floatingNavTabBarHeight(isTablet, insets.bottom) + 8}
      // As wide as the bar, just above it, like a music app's mini player; the floating search /
      // place buttons lift above it (setBarAccessoryHeight) instead of squeezing it to one side.
      dockInset={BAR_GUTTER}
      onDockHeight={setBarAccessoryHeight}
      renderSeek={({ value, max, label, onChange }) => (
        <Slider
          style={{ flex: 1, height: 28 }}
          minimumValue={0}
          maximumValue={max}
          value={value}
          onSlidingComplete={onChange}
          minimumTrackTintColor={colors.secondary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.secondary}
          accessibilityLabel={label}
        />
      )}
    />
  );
}
