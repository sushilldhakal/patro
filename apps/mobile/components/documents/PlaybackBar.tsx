import { useState } from "react";
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
export function PlaybackBar({ audio, documentTitle }: { audio: DocumentAudio & { foreign?: boolean }; documentTitle: string }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const { activeShloka } = audio;
  // Another page's recording is playing: the app-wide mini player shows that one instead.
  if (audio.foreign) return null;
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
      renderSeek={(args) => <SeekSlider {...args} colors={colors} />}
    />
  );
}

/**
 * The thumb stays where the finger is while it drags: the player's position, updated four
 * times a second, no longer pulls it back. The recording seeks once, on release.
 */
function SeekSlider({
  value,
  max,
  label,
  onChange,
  colors,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (seconds: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [held, setHeld] = useState<number | null>(null);
  return (
    <Slider
      style={{ flex: 1, height: 28 }}
      minimumValue={0}
      maximumValue={max}
      value={held ?? Math.min(value, max)}
      onSlidingStart={(at) => setHeld(at)}
      onValueChange={(at) => {
        if (held != null) setHeld(at);
      }}
      onSlidingComplete={(at) => {
        setHeld(null);
        onChange(at);
      }}
      minimumTrackTintColor={colors.secondary}
      maximumTrackTintColor={colors.border}
      thumbTintColor={colors.secondary}
      accessibilityLabel={label}
    />
  );
}
