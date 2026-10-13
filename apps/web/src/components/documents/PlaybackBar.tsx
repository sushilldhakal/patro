import { Headphones, ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { bilingualText, useLocale } from "@/i18n/locale";
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

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const { t } = useTranslation();
  const { lang } = useLocale();

  if (mode == null) {
    if (!hasFullRecording && !onPlayThrough) return null;
    return (
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
        <button
          type="button"
          onClick={hasFullRecording ? onStartFull : () => onPlayThrough?.()}
          className={cn(documentsClasses.barShell, documentsClasses.barPadIdle, documentsClasses.barRow, "text-left backdrop-blur transition-colors hover:border-secondary/60")}
        >
          <span className={cn(documentsClasses.barPlay, "text-secondary-foreground")}>
            <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className={documentsClasses.fill}>
            <span className={cn(documentsClasses.barTitle, "block truncate")}>
              {t(hasFullRecording ? "documents.play_full_recording" : "documents.play_through")}
            </span>
            <span className={cn(documentsClasses.barSubtitle, "block truncate")}>{documentTitle}</span>
          </span>
          <Headphones className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    );
  }

  if (mode === "full") {
    const fillPct = fullDuration > 0 ? (fullCurrentTime / fullDuration) * 100 : 0;
    return (
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
        <div className={cn(documentsClasses.barShell, documentsClasses.barPad, documentsClasses.barRow, "backdrop-blur")}>
          <button
            type="button"
            onClick={onToggleFull}
            aria-label={t(fullPlaying ? "documents.pause_verse" : "documents.play_full_recording")}
            className={cn(documentsClasses.barPlay, "text-secondary-foreground")}
          >
            {fullPlaying ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <div className={documentsClasses.fill}>
            <p className={cn(documentsClasses.barKicker, "truncate")}>
              {t("documents.play_full_recording")}
            </p>
            <div className={documentsClasses.barScrubRow}>
              <span className={documentsClasses.barTime}>
                {formatTime(fullCurrentTime)}
              </span>
              <input
                type="range"
                className="shloka-scrub w-full min-w-0 flex-1 cursor-pointer outline-none"
                style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
                min={0}
                max={fullDuration || 1}
                step={0.1}
                value={fullCurrentTime}
                onChange={(e) => onSeekFull(Number(e.target.value))}
                aria-label={t("documents.seek")}
              />
              <span className={documentsClasses.barTime}>
                {formatTime(fullDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mode === "verse"
  if (!activeShloka) return null;
  const canSwitchToFull = hasFullRecording && activeShloka.full_audio_start != null;
  const verseTitle = bilingualText(lang, activeShloka.meaning_ne, activeShloka.meaning_en);

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4">
      <div className={cn(documentsClasses.barShell, documentsClasses.barPad, "backdrop-blur")}>
        {activeShloka.audio_url ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span className={cn(documentsClasses.barTime, "text-right")}>
              {formatTime(verseCurrentTime)}
            </span>
            <div className={cn(documentsClasses.barTrack, "shloka-scrub")}>
              <div
                className={cn(documentsClasses.barTrackFill, "transition-[width]")}
                style={{ width: `${verseDuration > 0 ? (verseCurrentTime / verseDuration) * 100 : 0}%` }}
              />
            </div>
            <span className={documentsClasses.barTime}>
              {formatTime(verseDuration)}
            </span>
          </div>
        ) : null}

        <div className={documentsClasses.barRow}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label={t("documents.prev_verse")}
            className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}
          >
            <SkipBack className="size-4" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onToggleVerse}
            disabled={!activeShloka.audio_url}
            aria-label={t(versePlaying ? "documents.pause_verse" : "documents.play_verse")}
            className={cn(documentsClasses.barPlay, "text-secondary-foreground disabled:opacity-40")}
          >
            {versePlaying ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label={t("documents.next_verse")}
            className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}
          >
            <SkipForward className="size-4" fill="currentColor" />
          </button>

          <div className={documentsClasses.fill}>
            <p className={cn(documentsClasses.barKicker, "truncate")}>{documentTitle}</p>
            <p className={cn(documentsClasses.barTitle, "truncate")}>
              {t("documents.now_playing", { label: activeShloka.verse_label })}
              {verseTitle ? ` — ${verseTitle}` : ""}
            </p>
          </div>

          {canSwitchToFull ? (
            <button
              type="button"
              onClick={onSwitchToFull}
              aria-label={t("documents.switch_to_full")}
              title={t("documents.switch_to_full")}
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
