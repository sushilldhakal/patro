/**
 * Welcome overlay + chapter transport — the same chrome as the original lab.
 *
 * One scrubber. One play button. Chapter title in the middle, times on the
 * sides, skip either side of play. The playground's own year slider stays
 * off this page while the tour is running.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

import { useDayChapterBar, useDayChapterWelcome } from "@vedic-patro/features/learn";
import { cn } from "@vedic-patro/domain/utils";
import { edScrub } from "@/lib/diagram-classes";
import type { DayChapterPlayer } from "@/hooks/use-chapter-track";

export function DayChapterWelcome({
  player,
}: {
  player: DayChapterPlayer;
}) {
  const w = useDayChapterWelcome(player);
  if (!w.visible) return null;
  return (
    /* No `backdrop-blur` — the original's own welcome overlay is a plain
       `rgba(0,0,0,0.5)` scrim over the running scene, not a frosted one. */
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-4 transition-opacity">
      <div className="flex max-w-md flex-col items-center text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-eyebrow-wide text-white/55">
          {w.eyebrow}
        </p>
        {/* Sans throughout, matching the original — it declares no serif
            anywhere in its type scale (Source Sans Pro end to end). */}
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {w.title}
        </h2>
        <p className="mt-2 text-sm text-white/70 sm:text-base">
          {w.subtitle}
        </p>
        {/* `.is-gigantic` in the original — a button sized well past its
            normal chrome, the one clearly-largest thing on the screen. */}
        <button
          type="button"
          onClick={w.play}
          className="mt-6 grid size-24 cursor-pointer place-items-center rounded-full border border-white/30 bg-white text-black transition-transform hover:scale-105"
          aria-label={w.begin}
        >
          <Play size={40} fill="currentColor" strokeWidth={0} className="ml-1.5" />
        </button>
        <p className="mt-3 text-xs font-semibold uppercase tracking-eyebrow-wide text-white/70">
          {w.begin}
        </p>
        {/* The original's second way in: "or … go to playground". Only when
            this track actually ends on a free chapter to jump to. */}
        {w.playground ? (
          <button
            type="button"
            onClick={w.playground.open}
            className="mt-4 text-xs font-semibold uppercase tracking-eyebrow-wide text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            {w.playground.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DayChapterBar({ player }: { player: DayChapterPlayer }) {
  const bar = useDayChapterBar(player);
  const { scrub, toc, transport, volume } = bar;
  const tocOpen = toc.open;
  const setTocOpen = toc.setOpen;
  const volumeOpen = volume.open;
  const setVolumeOpen = volume.setOpen;
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
  }, [volumeOpen, setVolumeOpen]);

  const { free } = bar;
  const { isFirst, isLast, playing, ended } = transport;
  const VolumeIcon = volume.level === "mute" ? VolumeX : volume.level === "low" ? Volume1 : Volume2;

  return (
    <div className="flex flex-col">
      {free ? null : (
        <div className="relative">
          <input
            type="range"
            className={cn(edScrub, "ed-scrub-dark")}
            style={{ "--fill": `${scrub.progress}%` } as React.CSSProperties}
            min={0}
            max={scrub.max}
            step={scrub.step}
            value={scrub.value}
            onChange={(e) => scrub.seek(Number(e.target.value))}
            aria-label={scrub.label}
          />
          <div className="mt-1 flex items-start justify-between font-num text-xs tabular-nums text-white/45">
            <span>{scrub.time}</span>
            <span>{scrub.duration}</span>
          </div>
        </div>
      )}

      <div className="relative mt-1 flex justify-center">
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="flex max-w-full items-center gap-1.5 px-2 py-1 text-sm font-semibold text-white/90 hover:text-white"
        >
          <span className="truncate">{bar.heading}</span>
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
                    {toc.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTocOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={toc.closeLabel}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="touch-auto flex-1 overflow-y-auto overscroll-contain py-1">
                  {toc.parts.map((part) => (
                    <div key={part.key}>
                      {part.label ? (
                        <div className="px-4 pb-1 pt-3 text-diagram-xs font-semibold uppercase tracking-eyebrow-wide text-white/35">
                          {part.label}
                        </div>
                      ) : null}
                      {part.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.select}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold",
                            item.active
                              ? "bg-white/15 text-white"
                              : "text-white/70 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span className="w-5 shrink-0 tabular-nums text-white/40">
                            {item.number}
                          </span>
                          <span className="truncate">{item.title}</span>
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
            onClick={transport.prev}
            className="grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={transport.prevLabel}
          >
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={transport.primary}
            className="grid size-12 place-items-center text-white hover:text-white"
            aria-label={transport.primaryLabel}
          >
            {ended ? (
              <RotateCcw size={26} />
            ) : playing ? (
              <Pause size={28} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={28} fill="currentColor" strokeWidth={0} className="ml-0.75" />
            )}
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={transport.next}
            className={cn(
              "grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
              transport.nextHighlighted && "text-amber-100",
            )}
            aria-label={transport.nextLabel}
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
              aria-label={volume.label}
            >
              <VolumeIcon size={18} />
            </button>
            {volumeOpen && (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/90 px-3 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={volume.toggleMute}
                  className="shrink-0 text-white/70 hover:text-white"
                  aria-label={volume.label}
                >
                  <VolumeIcon size={16} />
                </button>
                <input
                  type="range"
                  className={cn(edScrub, "ed-scrub-dark w-24")}
                  style={{ "--fill": `${volume.value * 100}%` } as React.CSSProperties}
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume.value}
                  onChange={(e) => volume.set(Number(e.target.value))}
                  aria-label={volume.label}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
