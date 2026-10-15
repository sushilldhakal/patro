import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { PlaybackBar as Shared } from "@vedic-patro/ui/kit/jyotish";

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
      documentTitle={documentTitle}
      onStartFull={audio.startFull}
      onPlayThrough={audio.startPlayThrough}
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
