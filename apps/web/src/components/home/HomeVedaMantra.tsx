import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHomeVedaMantra } from "@vedic-patro/features/home";
import { HomeVedaMantra as HomeVedaMantraView } from "@vedic-patro/ui/kit/shell";
import { setMediaHandlers, setMediaMetadata, setMediaPlaybackState } from "@/lib/media-session";

/** Plays the recording and reports progress so the shared card can highlight the word. */
function useMantraAudio(url: string | null | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const raf = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(-1);

  useEffect(() => {
    if (!url) return;
    const el = new Audio(url);
    el.preload = "none";
    const stopLoop = () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
    const tick = () => {
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
      raf.current = requestAnimationFrame(tick);
    };
    el.onplay = () => {
      setPlaying(true);
      stopLoop();
      raf.current = requestAnimationFrame(tick);
      setMediaMetadata(document.title);
      setMediaHandlers({ play: () => void el.play().catch(() => {}), pause: () => el.pause() });
      setMediaPlaybackState("playing");
    };
    el.onpause = () => {
      if (el.ended) return;
      setPlaying(false);
      stopLoop();
      setMediaPlaybackState("paused");
    };
    el.onended = () => {
      setPlaying(false);
      setProgress(-1);
      stopLoop();
      setMediaPlaybackState("paused");
    };
    audio.current = el;
    return () => {
      stopLoop();
      el.pause();
      el.src = "";
      audio.current = null;
      setPlaying(false);
      setProgress(-1);
    };
  }, [url]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  return { playing, progress: playing ? progress : -1, toggle };
}

/** Today's Veda mantra. Audio and the document route stay here; the card is shared. */
export function HomeVedaMantra({ dateAd, className }: { dateAd: string | undefined; className?: string }) {
  const navigate = useNavigate();
  const mantra = useHomeVedaMantra(dateAd);
  const audio = useMantraAudio(mantra.audioUrl);
  if (!mantra.ready) return null;
  const { copy, read } = mantra;
  return (
    <HomeVedaMantraView
      className={className}
      title={copy.title}
      tokens={mantra.tokens}
      activeToken={mantra.activeTokenAt(audio.progress)}
      source={mantra.source}
      readMore={copy.readMore}
      playLabel={copy.play}
      pauseLabel={copy.pause}
      playing={audio.playing}
      onToggle={mantra.audioUrl ? audio.toggle : undefined}
      onOpenPassage={() =>
        navigate({
          to: "/documents/$slug/$chapter",
          params: { slug: read.slug, chapter: read.chapter },
          hash: read.anchor,
        })
      }
    />
  );
}
