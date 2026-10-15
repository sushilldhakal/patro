import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { useHomeVedaMantra } from "@vedic-patro/features/home";
import { setMediaHandlers, setMediaMetadata, setMediaPlaybackState } from "@/lib/media-session";
import { patroCard, patroSecBand } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

/**
 * One recording. `progress` (0..1) is read on every animation frame while it
 * plays so the word highlight follows smoothly; it is -1 when nothing plays.
 */
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

function MantraPlayButton({
  playing,
  onToggle,
  label,
}: {
  playing: boolean;
  onToggle: () => void;
  label: { play: string; pause: string };
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? label.pause : label.play}
      className={cn("inline-flex shrink-0 text-secondary-foreground transition-opacity hover:opacity-90 active:scale-95", homeClasses.vedaPlay)}
    >
      {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
    </button>
  );
}

/** Today's Veda mantra — Sanskrit, audio, and a link to the passage. */
export function HomeVedaMantra({ dateAd, className }: { dateAd: string | undefined; className?: string }) {
  const mantra = useHomeVedaMantra(dateAd);
  const mantraAudio = useMantraAudio(mantra.audioUrl);
  if (!mantra.ready) return null;

  const { copy } = mantra;
  const activeToken = mantra.activeTokenAt(mantraAudio.progress);

  return (
    <section className={cn(patroCard, className)} aria-label={copy.title}>
      <div className={patroSecBand}>
        <h2 className={homeClasses.vedaTitle}>{copy.title}</h2>
        {mantra.audioUrl ? (
          <MantraPlayButton
            playing={mantraAudio.playing}
            onToggle={mantraAudio.toggle}
            label={{ play: copy.play, pause: copy.pause }}
          />
        ) : null}
      </div>
      <div className={homeClasses.vedaBody}>
        <p lang="sa" className={homeClasses.vedaSanskrit}>
          {mantra.tokens.map((tok, i) =>
            i === activeToken ? (
              <span
                key={i}
                className={cn(homeClasses.vedaWord, "px-0.5 transition-colors duration-150")}
              >
                {tok}
              </span>
            ) : (
              tok
            ),
          )}
        </p>
        <div className={homeClasses.vedaFooter}>
          <Link
            to="/documents/$slug/$chapter"
            params={{ slug: mantra.read.slug, chapter: mantra.read.chapter }}
            hash={mantra.read.anchor}
            className={cn(homeClasses.vedaMore, "no-underline hover:underline")}
          >
            {copy.readMore}
          </Link>
          <span className={homeClasses.vedaSource}>{mantra.source}</span>
        </div>
      </div>
    </section>
  );
}
