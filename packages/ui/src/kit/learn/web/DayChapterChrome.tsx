import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useDayChapterBar, useDayChapterWelcome } from "@vedic-patro/features/learn";
import { cn } from "@vedic-patro/design-tokens/cn";
import { edScrub } from "@vedic-patro/design-tokens/classes/diagram-classes";
import type { DayChapterBarProps, DayChapterWelcomeProps } from "../contract";

export function DayChapterWelcome({ player, playIcon }: DayChapterWelcomeProps) {
  const w = useDayChapterWelcome(player);
  if (!w.visible) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-4 transition-opacity">
      <div className="flex max-w-md flex-col items-center text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-eyebrow-wide text-white/55">{w.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{w.title}</h2>
        <p className="mt-2 text-sm text-white/70 sm:text-base">{w.subtitle}</p>
        <button
          type="button"
          onClick={w.play}
          className="mt-6 grid size-24 cursor-pointer place-items-center rounded-full border border-white/30 bg-white text-black transition-transform hover:scale-105"
          aria-label={w.begin}
        >
          {playIcon}
        </button>
        <p className="mt-3 text-xs font-semibold uppercase tracking-eyebrow-wide text-white/70">{w.begin}</p>
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

export function DayChapterBar({ player, icons, portal }: DayChapterBarProps) {
  const bar = useDayChapterBar(player);
  const { scrub, toc, transport, volume, free } = bar;
  const volumeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!volume.open) return;
    const onDoc = (event: PointerEvent) => {
      if (!volumeRef.current?.contains(event.target as Node)) volume.setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [volume.open, volume.setOpen]);

  return (
    <div className="flex flex-col">
      {free ? null : (
        <div className="relative">
          <input
            type="range"
            className={cn(edScrub, "ed-scrub-dark")}
            style={{ "--fill": `${scrub.progress}%` } as CSSProperties}
            min={0}
            max={scrub.max}
            step={scrub.step}
            value={scrub.value}
            onChange={(event) => scrub.seek(Number(event.target.value))}
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
          onClick={() => toc.setOpen((open) => !open)}
          className="flex max-w-full items-center gap-1.5 px-2 py-1 text-sm font-semibold text-white/90 hover:text-white"
        >
          <span className="truncate">{bar.heading}</span>
          <span className={cn("inline-flex shrink-0 text-white/50 transition-transform", toc.open ? "" : "rotate-180")}>{icons.chevron}</span>
        </button>
        {toc.open
          ? (portal ?? ((node: ReactNode) => node))(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => toc.setOpen(false)}>
              <div
                data-ui-panel
                onClick={(event) => event.stopPropagation()}
                className="flex max-h-[80vh] w-full max-w-sm touch-auto flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/95 backdrop-blur"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">{toc.title}</span>
                  <button
                    type="button"
                    onClick={() => toc.setOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={toc.closeLabel}
                  >
                    {icons.close}
                  </button>
                </div>
                <div className="touch-auto flex-1 overflow-y-auto overscroll-contain py-1">
                  {toc.parts.map((part) => (
                    <div key={part.key}>
                      {part.label ? (
                        <div className="px-4 pb-1 pt-3 text-diagram-xs font-semibold uppercase tracking-eyebrow-wide text-white/35">{part.label}</div>
                      ) : null}
                      {part.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.select}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold",
                            item.active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span className="w-5 shrink-0 tabular-nums text-white/40">{item.number}</span>
                          <span className="truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>,
          )
          : null}
      </div>

      {free ? null : (
        <div className="relative mt-1 flex items-center justify-center gap-5">
          <button
            type="button"
            disabled={transport.isFirst}
            onClick={transport.prev}
            className="grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={transport.prevLabel}
          >
            {icons.prev}
          </button>
          <button
            type="button"
            onClick={transport.primary}
            className="grid size-12 place-items-center text-white hover:text-white"
            aria-label={transport.primaryLabel}
          >
            {transport.ended ? icons.replay : transport.playing ? icons.pause : icons.play}
          </button>
          <button
            type="button"
            disabled={transport.isLast}
            onClick={transport.next}
            className={cn(
              "grid size-10 place-items-center text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
              transport.nextHighlighted && "text-amber-100",
            )}
            aria-label={transport.nextLabel}
          >
            {icons.next}
          </button>
          <div className="absolute right-0" ref={volumeRef}>
            <button
              type="button"
              onClick={() => volume.setOpen((open) => !open)}
              className="grid size-9 place-items-center rounded-full text-white/60 hover:text-white"
              aria-label={volume.label}
            >
              {icons.volume(volume.level)}
            </button>
            {volume.open ? (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/90 px-3 py-2 backdrop-blur">
                <button type="button" onClick={volume.toggleMute} className="shrink-0 text-white/70 hover:text-white" aria-label={volume.label}>
                  {icons.volume(volume.level)}
                </button>
                <input
                  type="range"
                  className={cn(edScrub, "ed-scrub-dark w-24")}
                  style={{ "--fill": `${volume.value * 100}%` } as CSSProperties}
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume.value}
                  onChange={(event) => volume.set(Number(event.target.value))}
                  aria-label={volume.label}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
