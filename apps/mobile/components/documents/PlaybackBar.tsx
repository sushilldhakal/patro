import { useState } from "react";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { setBarAccessoryHeight } from "@/lib/bar-accessory";
import { useBreakpoint } from "@/lib/responsive";
import { brand, withAlpha } from "@vedic-patro/design-tokens";
import { PlaybackBar as Shared } from "@vedic-patro/ui/kit/jyotish";

/** Binds the shared transport to the app audio engine and the native slider. */
export function PlaybackBar({
  audio,
  documentTitle,
  chapterTitle,
  close,
  open,
}: {
  audio: DocumentAudio & { foreign?: boolean };
  documentTitle: string;
  /** The chapter a full recording belongs to (an Atharvaveda kanda), named in the bar. */
  chapterTitle?: string;
  /** The mini player on other pages: an X to stop, and a title that goes back to the text. */
  close?: { label: string; onPress: () => void };
  open?: { hint: string; onPress: () => void };
}) {
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
      suktaLabel={audio.suktaLabel}
      documentTitle={documentTitle}
      chapterTitle={chapterTitle}
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
      hasPrevFull={audio.hasPrevFull}
      hasNextFull={audio.hasNextFull}
      onPrevFull={audio.prevFull}
      onNextFull={audio.nextFull}
      dockBottom={floatingNavTabBarHeight(isTablet, insets.bottom) + 8}
      // Edge to edge just above the tab bar, like a radio app's player; the floating search /
      // place buttons lift above it (setBarAccessoryHeight) instead of squeezing it to one side.
      dockInset={0}
      onDockHeight={setBarAccessoryHeight}
      renderSeek={(args) => <SeekSlider {...args} />}
      close={close}
      open={open}
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
}: {
  value: number;
  max: number;
  label: string;
  onChange: (seconds: number) => void;
}) {
  const [held, setHeld] = useState<number | null>(null);
  return (
    <Slider
      style={{ flex: 1, height: 24 }}
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
      // The player is a brand-teal band in both themes: saffron fill and thumb on an off-white track.
      minimumTrackTintColor={brand.saffron}
      maximumTrackTintColor={withAlpha(brand.offWhite, 0.25)}
      thumbTintColor={brand.saffron}
      accessibilityLabel={label}
    />
  );
}
