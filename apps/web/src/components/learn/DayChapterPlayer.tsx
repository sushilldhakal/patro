/**
 * Welcome overlay + chapter transport — the same chrome as the original lab.
 *
 * One scrubber. One play button. Chapter title in the middle, times on the
 * sides, skip either side of play. The playground's own year slider stays
 * off this page while the tour is running.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { formatChapterClock } from "@/lib/learn/chapter-player";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { useLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { edScrub } from "@/lib/diagram-classes";
import { chapterParts } from "@/lib/learn/chapter-tracks";
import type { DayChapterPlayer } from "@/hooks/use-chapter-track";

export function DayChapterWelcome({
  player,
}: {
  player: DayChapterPlayer;
}) {
  const { t } = useTranslation();
  if (!player.showWelcome) return null;
  const lastIndex = player.chapters.length - 1;
  const hasPlayground = Boolean(player.chapters[lastIndex]?.free);
  return (
    /* No `backdrop-blur` — the original's own welcome overlay is a plain
       `rgba(0,0,0,0.5)` scrim over the running scene, not a frosted one. */
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-4 transition-opacity">
      <div className="flex max-w-md flex-col items-center text-center text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          {t("learn.chapters.eyebrow")}
        </p>
        {/* Sans throughout, matching the original — it declares no serif
            anywhere in its type scale (Source Sans Pro end to end). */}
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t(player.track.titleKey)}
        </h2>
        <p className="mt-2 text-sm text-white/70 sm:text-base">
          {t(player.track.subtitleKey)}
        </p>
        {/* `.is-gigantic` in the original — a button sized well past its
            normal chrome, the one clearly-largest thing on the screen. */}
        <button
          type="button"
          onClick={player.play}
          className="mt-6 grid size-24 cursor-pointer place-items-center rounded-full border border-white/30 bg-white text-black transition-transform hover:scale-105"
          aria-label={t("learn.chapters.begin")}
        >
          <Play size={40} fill="currentColor" strokeWidth={0} className="ml-1.5" />
        </button>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
          {t("learn.chapters.begin")}
        </p>
        {/* The original's second way in: "or … go to playground". Only when
            this track actually ends on a free chapter to jump to. */}
        {hasPlayground ? (
          <button
            type="button"
            onClick={() => player.goTo(lastIndex)}
            className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            {t("learn.chapters.playground")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DayChapterBar({ player }: { player: DayChapterPlayer }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = (v: string) => (ne ? toNepaliDigits(v) : v);
  const [tocOpen, setTocOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useRef<HTMLDivElement | null>(null);

  /* No outside-pointerdown listener here, unlike the volume popover below:
     the TOC is portalled to <body> (see its own comment), so it is never a
     descendant of anything in this component to test containment against.
     Its own backdrop's onClick (with the panel's stopPropagation) does the
     same job directly. */
  useEffect(() => {
    if (!volumeOpen) return;
    const onDoc = (e: PointerEvent) => {
      if (!volumeRef.current?.contains(e.target as Node)) setVolumeOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [volumeOpen]);

  const parts = useMemo(() => chapterParts(player.chapters), [player.chapters]);
  const free = Boolean(player.chapter.free);
  const progress = player.duration > 0 ? (player.time / player.duration) * 100 : 0;
  const isLast = player.index >= player.chapters.length - 1;
  const isFirst = player.index <= 0;
  const playing = player.playing;
  const ended = player.ended;
  const VolumeIcon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex flex-col">
      {free ? null : (
        <div className="relative">
          <input
            type="range"
            className={cn(edScrub, "ed-scrub-dark")}
            style={{ "--fill": `${progress}%` } as React.CSSProperties}
            min={0}
            max={player.duration || 1}
            step={50}
            value={player.time}
            onChange={(e) => player.seek(Number(e.target.value))}
            aria-label={t("learn.chapters.scrub")}
          />
          <div className="mt-1 flex items-start justify-between font-num text-[11px] tabular-nums text-white/45">
            <span>{num(formatChapterClock(player.time))}</span>
            <span>{num(formatChapterClock(player.duration))}</span>
          </div>
        </div>
      )}

      <div className="relative mt-1 flex justify-center">
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="flex max-w-full items-center gap-1.5 px-2 py-1 text-sm font-semibold text-white/90 hover:text-white"
        >
          <span className="truncate">
            {t("learn.chapters.chapter")} {num(String(player.index + 1))}
            {": "}
            {t(player.chapter.titleKey)}
          </span>
          <ChevronUp size={14} className={cn("shrink-0 text-white/50 transition-transform", tocOpen ? "" : "rotate-180")} />
        </button>
        {/*
         * Portalled to <body>, not opened in place.
         *
         * This row sits inside the details panel, which scrolls in fullscreen
         * (`overflow-y-auto` on an ancestor) — an `absolute` menu anchored here
         * was clipped by that ancestor's overflow box instead of floating free
         * of it, which is what actually made "pick a chapter" unusable in
         * fullscreen: half the list was cut off or unreachable, not just
         * visually cramped. A portal escapes that ancestor entirely, the same
         * fix `DayPlaygroundStudy`'s own fullscreen view already uses to clear
         * the app chrome — this clears the details panel instead.
         */}
        {tocOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
              onClick={() => setTocOpen(false)}
            >
              <div
                data-ui-panel
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[80vh] w-full max-w-sm touch-auto flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/95 backdrop-blur"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">
                    {t("learn.chapters.chapter_list")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTocOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={t("common.close")}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="touch-auto flex-1 overflow-y-auto overscroll-contain py-1">
                  {parts.map((part, pi) => (
                    <div key={part.partKey ?? `p-${pi}`}>
                      {part.partKey ? (
                        <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                          {t(part.partKey)}
                        </div>
                      ) : null}
                      {part.items.map(({ chapter, index }) => (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => {
                            player.goTo(index);
                            setTocOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold",
                            index === player.index
                              ? "bg-white/15 text-white"
                              : "text-white/70 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span className="w-5 shrink-0 tabular-nums text-white/40">
                            {num(String(index + 1))}
                          </span>
                          <span className="truncate">{t(chapter.titleKey)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>

      {/* Free play has no transport row at all in the reference lab — the
          playground page is just the scene plus its own controls; auto-play
          there is the orbit toggle up in that panel, not a bottom bar.
          Narration is the only thing this row (play/pause/skip/volume)
          belongs to, so it renders only where narration does. */}
      {free ? null : (
        <div className="relative mt-1 flex items-center justify-center gap-5">
          <button
            type="button"
            disabled={isFirst}
            onClick={player.prev}
            className="grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t("learn.chapters.prev")}
          >
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={
              ended
                ? () => {
                    player.seek(0);
                    player.play();
                  }
                : player.toggle
            }
            className="grid size-12 place-items-center text-white hover:text-white"
            aria-label={ended ? t("learn.chapters.replay") : playing ? t("learn.pause") : t("learn.play")}
          >
            {ended ? (
              <RotateCcw size={26} />
            ) : playing ? (
              <Pause size={28} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={28} fill="currentColor" strokeWidth={0} className="ml-[3px]" />
            )}
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={player.next}
            className={cn(
              "grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
              player.ended && !isLast && "text-amber-100",
            )}
            aria-label={t("learn.chapters.next")}
          >
            <SkipForward size={22} fill="currentColor" />
          </button>

          {/* The reference lab's speaker icon — tucked to a corner while the
              transport stays centred, same as its bottom-left placement. */}
          <div className="absolute right-0" ref={volumeRef}>
            <button
              type="button"
              onClick={() => setVolumeOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-full text-white/60 hover:text-white"
              aria-label={t("learn.chapters.volume")}
            >
              <VolumeIcon size={18} />
            </button>
            {volumeOpen && (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/90 px-3 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={player.toggleMute}
                  className="shrink-0 text-white/70 hover:text-white"
                  aria-label={t("learn.chapters.volume")}
                >
                  <VolumeIcon size={16} />
                </button>
                <input
                  type="range"
                  className={cn(edScrub, "ed-scrub-dark w-24")}
                  style={{ "--fill": `${player.volume * 100}%` } as React.CSSProperties}
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.volume}
                  onChange={(e) => player.setVolume(Number(e.target.value))}
                  aria-label={t("learn.chapters.volume")}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
