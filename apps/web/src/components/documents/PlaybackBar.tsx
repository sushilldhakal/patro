import { Headphones, ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bilingualText, useLocale } from "@/i18n/locale";
import type { Shloka } from "@/lib/documents-api";

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
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 text-left shadow-lg backdrop-blur transition-colors hover:border-secondary/60"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {t(hasFullRecording ? "documents.play_full_recording" : "documents.play_through")}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{documentTitle}</span>
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
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={onToggleFull}
            aria-label={t(fullPlaying ? "documents.pause_verse" : "documents.play_full_recording")}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            {fullPlaying ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {t("documents.play_full_recording")}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="w-8 shrink-0 text-[10px] tabular-nums text-muted-foreground">
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
              <span className="w-8 shrink-0 text-[10px] tabular-nums text-muted-foreground">
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
      <div className="rounded-2xl border border-border bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur">
        {activeShloka.audio_url ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
              {formatTime(verseCurrentTime)}
            </span>
            <div className="shloka-scrub h-1 w-full min-w-0 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full bg-secondary transition-[width]"
                style={{ width: `${verseDuration > 0 ? (verseCurrentTime / verseDuration) * 100 : 0}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(verseDuration)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label={t("documents.prev_verse")}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <SkipBack className="size-4" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onToggleVerse}
            disabled={!activeShloka.audio_url}
            aria-label={t(versePlaying ? "documents.pause_verse" : "documents.play_verse")}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40"
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
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <SkipForward className="size-4" fill="currentColor" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-muted-foreground">{documentTitle}</p>
            <p className="truncate text-sm font-semibold">
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
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <ListMusic className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
