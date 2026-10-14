import { Headphones, ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlaybackBar } from "@vedic-patro/features/documents";
import type { Shloka } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

interface Props {
  mode: "full" | "verse" | null;
  hasFullRecording: boolean;
  documentTitle: string;
  onStartFull: () => void;
  /**
   * Verses have their own clips and no single full-file recording. Starts at
   * the first verse; each clip hands off to the next when it ends.
   */
  onPlayThrough?: () => void;

  fullPlaying: boolean;
  fullCurrentTime: number;
  fullDuration: number;
  onToggleFull: () => void;
  onSeekFull: (time: number) => void;

  activeShloka: Shloka | null;
  versePlaying: boolean;
  verseCurrentTime: number;
  verseDuration: number;
  hasNext: boolean;
  hasPrev: boolean;
  onToggleVerse: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSwitchToFull: () => void;
}

/**
 * One floating transport bar for the whole document — plays either the
 * single continuous recording or one verse's own clip, never both. Which one
 * is showing is `mode`, owned by the page: `null` (nothing engaged yet) shows
 * a single "play the whole thing" button; `"full"` shows the full-recording
 * transport; `"verse"` shows per-verse transport plus a button to hand off to
 * the full recording, picking up at that verse's real timestamp within it.
 */
export function PlaybackBar({
  mode,
  hasFullRecording,
  documentTitle,
  onStartFull,
  onPlayThrough,
  fullPlaying,
  fullCurrentTime,
  fullDuration,
  onToggleFull,
  onSeekFull,
  activeShloka,
  versePlaying,
  verseCurrentTime,
  verseDuration,
  hasNext,
  hasPrev,
  onToggleVerse,
  onNext,
  onPrev,
  onSwitchToFull,
}: Props) {
  const bar = usePlaybackBar({
    mode,
    hasFullRecording,
    canPlayThrough: Boolean(onPlayThrough),
    full: { playing: fullPlaying, currentTime: fullCurrentTime, duration: fullDuration },
    verse: { playing: versePlaying, currentTime: verseCurrentTime, duration: verseDuration },
    activeShloka,
  });
  const { copy } = bar;

  if (bar.face === "hidden") return null;

  if (bar.face === "idle") {
    return (
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
        <button
          type="button"
          onClick={bar.idle.startsFull ? onStartFull : () => onPlayThrough?.()}
          className={cn(documentsClasses.barShell, documentsClasses.barPadIdle, documentsClasses.barRow, "text-left backdrop-blur transition-colors hover:border-secondary/60")}
        >
          <span className={cn(documentsClasses.barPlay, "text-secondary-foreground")}>
            <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className={documentsClasses.fill}>
            <span className={cn(documentsClasses.barTitle, "block truncate")}>
              {bar.idle.title}
            </span>
            <span className={cn(documentsClasses.barSubtitle, "block truncate")}>{documentTitle}</span>
          </span>
          <Headphones className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    );
  }

  if (bar.face === "full") {
    return (
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
        <div className={cn(documentsClasses.barShell, documentsClasses.barPad, documentsClasses.barRow, "backdrop-blur")}>
          <button
            type="button"
            onClick={onToggleFull}
            aria-label={bar.full.toggleLabel}
            className={cn(documentsClasses.barPlay, "text-secondary-foreground")}
          >
            {bar.full.playing ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <div className={documentsClasses.fill}>
            <p className={cn(documentsClasses.barKicker, "truncate")}>
              {copy.playFull}
            </p>
            <div className={documentsClasses.barScrubRow}>
              <span className={documentsClasses.barTime}>
                {bar.full.current}
              </span>
              <input
                type="range"
                className="shloka-scrub w-full min-w-0 flex-1 cursor-pointer outline-none"
                style={{ "--fill": `${bar.full.fillPct}%` } as React.CSSProperties}
                min={0}
                max={fullDuration || 1}
                step={0.1}
                value={fullCurrentTime}
                onChange={(e) => onSeekFull(Number(e.target.value))}
                aria-label={copy.seek}
              />
              <span className={documentsClasses.barTime}>
                {bar.full.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
      <div className={cn(documentsClasses.barShell, documentsClasses.barPad, "backdrop-blur")}>
        {bar.verse.hasClip ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span className={cn(documentsClasses.barTime, "text-right")}>
              {bar.verse.current}
            </span>
            <div className={cn(documentsClasses.barTrack, "shloka-scrub")}>
              <div
                className={cn(documentsClasses.barTrackFill, "transition-[width]")}
                style={{ width: `${bar.verse.fillPct}%` }}
              />
            </div>
            <span className={documentsClasses.barTime}>
              {bar.verse.total}
            </span>
          </div>
        ) : null}

        <div className={documentsClasses.barRow}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label={copy.prevVerse}
            className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}
          >
            <SkipBack className="size-4" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onToggleVerse}
            disabled={!bar.verse.hasClip}
            aria-label={bar.verse.toggleLabel}
            className={cn(documentsClasses.barPlay, "text-secondary-foreground disabled:opacity-40")}
          >
            {bar.verse.playing ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label={copy.nextVerse}
            className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}
          >
            <SkipForward className="size-4" fill="currentColor" />
          </button>

          <div className={documentsClasses.fill}>
            <p className={cn(documentsClasses.barKicker, "truncate")}>{documentTitle}</p>
            <p className={cn(documentsClasses.barTitle, "truncate")}>{bar.verse.title}</p>
          </div>

          {bar.verse.canSwitchToFull ? (
            <button
              type="button"
              onClick={onSwitchToFull}
              aria-label={copy.switchToFull}
              title={copy.switchToFull}
              className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground")}
            >
              <ListMusic className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
