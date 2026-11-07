import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { canonVerseLabel, type ReaderRow } from "@vedic-patro/features/documents";
import { useLocale } from "@vedic-patro/i18n/react";
import { DocumentGroupHeading } from "@vedic-patro/ui/kit/jyotish";
import { ShlokaCard } from "@/components/documents/ShlokaCard";
import type { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

type Playback = ReturnType<typeof useDocumentPlayback>;

type Focus = { label: string; nonce: number; align?: "start" | "center" };

/** A document's verse rows (chapter headings, sukta headings, verses) from `@vedic-patro/features/documents`. */
export function ReaderRows({
  rows,
  versePlayer,
  fullRecording,
  virtual = false,
  loadingPrev = false,
  loadingNext = false,
  onNearStart,
  onNearEnd,
  focus = null,
  activeVerseId = null,
  onTopVerse,
  suktaAudio,
  clipConfirmed,
}: {
  rows: ReaderRow[];
  versePlayer: Playback["versePlayer"];
  fullRecording?: Playback["fullRecordingControls"];
  /** Rigveda: each sukta heading plays that sukta's continuous file. */
  suktaAudio?: Playback["suktaControls"];
  /** Whether a verse's own clip is confirmed in storage (Rigveda); others always pass. */
  clipConfirmed?: Playback["verseClipConfirmed"];
  /** Window virtualizer: only the rows on screen, plus a little overscan. Chapter pages turn this on. */
  virtual?: boolean;
  loadingPrev?: boolean;
  loadingNext?: boolean;
  onNearStart?: () => void;
  onNearEnd?: () => void;
  /** Scroll a verse into view once its row exists (hash, jump, or restored position). */
  focus?: Focus | null;
  /** The verse that is sounding — kept in view as playback moves. */
  activeVerseId?: number | null;
  /** The verse nearest the top of the window, so leaving the page can restore it. */
  onTopVerse?: (label: string) => void;
}) {
  if (virtual) {
    return (
      <VirtualRows
        rows={rows}
        versePlayer={versePlayer}
        fullRecording={fullRecording}
        loadingPrev={loadingPrev}
        loadingNext={loadingNext}
        onNearStart={onNearStart}
        onNearEnd={onNearEnd}
        focus={focus}
        activeVerseId={activeVerseId}
        onTopVerse={onTopVerse}
        suktaAudio={suktaAudio}
        clipConfirmed={clipConfirmed}
      />
    );
  }
  return (
    <div className="min-w-0 max-w-full space-y-2">
      {rows.map((row) => (
        <RowView key={row.key} row={row} versePlayer={versePlayer} fullRecording={fullRecording} suktaAudio={suktaAudio} clipConfirmed={clipConfirmed} />
      ))}
    </div>
  );
}

type RowExtras = {
  suktaAudio?: Playback["suktaControls"];
  clipConfirmed?: Playback["verseClipConfirmed"];
};

function RowView({
  row,
  versePlayer,
  fullRecording,
  suktaAudio,
  clipConfirmed,
}: {
  row: ReaderRow;
  versePlayer: Playback["versePlayer"];
  fullRecording?: Playback["fullRecordingControls"];
} & RowExtras) {
  if (row.kind === "chapter") {
    return (
      <header id={row.anchor} className={cn(documentsClasses.statsRow, "scroll-mt-24 pt-7")}>
        <span className={cn(documentsClasses.chapterBubble, documentsClasses.chapterBubbleText)}>{row.numberLabel}</span>
        <div className="min-w-0">
          <h2 className={documentsClasses.chapterHeading}>{row.heading}</h2>
          {row.title ? <p className={documentsClasses.chapterHeadingSub}>{row.title}</p> : null}
        </div>
      </header>
    );
  }
  if (row.kind === "sukta") {
    const sukta = row.sukta;
    return (
      <DocumentGroupHeading
        heading={row.heading}
        meta={row.meta}
        play={
          suktaAudio?.has(sukta)
            ? { playing: suktaAudio.playing === sukta, onPress: () => suktaAudio.toggle(sukta) }
            : undefined
        }
      />
    );
  }
  if (row.kind === "images") {
    return (
      <div className={documentsClasses.chapterImages}>
        {row.urls.map((url) => (
          <img key={url} src={url} alt="" className={documentsClasses.chapterImage} loading="lazy" />
        ))}
      </div>
    );
  }
  return (
    <ShlokaCard
      shloka={clipConfirmed && !clipConfirmed(row.shloka) ? { ...row.shloka, audio_url: null } : row.shloka}
      player={versePlayer}
      fullRecording={fullRecording}
    />
  );
}

type Slot =
  | { kind: "edge"; key: string }
  | { kind: "row"; key: string; row: ReaderRow };

function estimateSlot(slot: Slot | undefined): number {
  if (!slot || slot.kind === "edge") return 44;
  if (slot.row.kind === "verse") return 176;
  if (slot.row.kind === "sukta") return 64;
  if (slot.row.kind === "images") return 220;
  return 80;
}

function verseSlotIndex(slots: readonly Slot[], label: string): number {
  const canon = canonVerseLabel(label);
  return slots.findIndex(
    (slot) => slot.kind === "row" && slot.row.kind === "verse" && canonVerseLabel(slot.row.shloka.verse_label) === canon,
  );
}

function VirtualRows({
  rows,
  versePlayer,
  fullRecording,
  loadingPrev,
  loadingNext,
  onNearStart,
  onNearEnd,
  focus,
  activeVerseId,
  onTopVerse,
  suktaAudio,
  clipConfirmed,
}: {
  rows: ReaderRow[];
  versePlayer: Playback["versePlayer"];
  fullRecording?: Playback["fullRecordingControls"];
  loadingPrev: boolean;
  loadingNext: boolean;
  onNearStart?: () => void;
  onNearEnd?: () => void;
  focus: Focus | null;
  activeVerseId: number | null;
  onTopVerse?: (label: string) => void;
} & RowExtras) {
  const { t } = useLocale();
  const loadingLabel = t("documents.loading_more");
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const slots: Slot[] = useMemo(
    () => [
      ...(loadingPrev ? [{ kind: "edge" as const, key: "edge-start" }] : []),
      ...rows.map((row) => ({ kind: "row" as const, key: row.key, row })),
      ...(loadingNext ? [{ kind: "edge" as const, key: "edge-end" }] : []),
    ],
    [rows, loadingPrev, loadingNext],
  );

  const virtualizer = useWindowVirtualizer({
    count: slots.length,
    estimateSize: (index) => estimateSlot(slots[index]),
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => slots[index]?.key ?? index,
  });
  const virtualizerRef = useRef(virtualizer);
  useEffect(() => {
    virtualizerRef.current = virtualizer;
  }, [virtualizer]);

  // The list's document position changes with whatever sits above it. The 1px
  // guard keeps a settled margin from scheduling another render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const next = el.getBoundingClientRect().top + window.scrollY;
    setScrollMargin((prev) => (Math.abs(prev - next) < 1 ? prev : next));
  });

  const anchorRef = useRef<{ key: string; viewportTop: number } | null>(null);
  const prevFirst = useRef<string | null>(null);
  useLayoutEffect(() => {
    const firstKey = slots[0]?.key ?? null;
    const anchor = anchorRef.current;
    const prepended = prevFirst.current != null && firstKey !== prevFirst.current;
    if (prepended && anchor) {
      const index = slots.findIndex((slot) => slot.key === anchor.key);
      if (index >= 0) {
        const start = virtualizer.measurementsCache[index]?.start ?? index * estimateSlot(slots[index]);
        const want = scrollMargin + start - anchor.viewportTop;
        if (Math.abs(want - window.scrollY) > 2) window.scrollTo({ top: want, behavior: "auto" });
      }
    }
    prevFirst.current = firstKey;
    const y = window.scrollY;
    let next: { key: string; viewportTop: number } | null = null;
    for (const item of virtualizer.getVirtualItems()) {
      const viewportTop = scrollMargin + item.start - y;
      if (viewportTop + item.size > 8) {
        const slot = slots[item.index];
        if (slot) next = { key: slot.key, viewportTop };
        break;
      }
    }
    anchorRef.current = next;
  });

  const focusNonce = focus?.nonce;
  const [armedNonce, setArmedNonce] = useState<number | null>(null);
  const armed = armedNonce === (focusNonce ?? 0);
  useEffect(() => {
    const nonce = focusNonce ?? 0;
    const t = window.setTimeout(() => setArmedNonce(nonce), 700);
    return () => window.clearTimeout(t);
  }, [focusNonce]);

  // A jump scrolls to its verse once. It re-aims while rows settle (their measured heights move it)
  // and until the verse's page arrives, but not after: a page loaded by scrolling up or down later
  // must not pull the reader back to the verse they searched for.
  const focusDone = useRef<string | null>(null);
  const focusKey = focus ? `${focus.label}|${focus.nonce}` : null;
  useEffect(() => {
    if (!focus || !focusKey) return;
    if (focusDone.current === focusKey) return;
    const index = verseSlotIndex(slots, focus.label);
    if (index < 0) return;
    if (armed) focusDone.current = focusKey;
    const align = focus.align ?? "center";
    virtualizerRef.current.scrollToIndex(index, { align, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => {
      virtualizerRef.current.scrollToIndex(index, { align, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
    // slots identity changes when a page arrives; nonce covers a repeat jump to the same label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, focus?.align, slots.length, rows, armed]);

  // Follow the sounding verse when it changes — not again on every page load, or a paused verse
  // would drag the reader back each time scrolling loads more.
  const followed = useRef<number | null>(null);
  useEffect(() => {
    if (activeVerseId == null) {
      followed.current = null;
      return;
    }
    if (followed.current === activeVerseId) return;
    const index = slots.findIndex(
      (slot) => slot.kind === "row" && slot.row.kind === "verse" && slot.row.shloka.id === activeVerseId,
    );
    if (index < 0) return;
    followed.current = activeVerseId;
    virtualizerRef.current.scrollToIndex(index, { align: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVerseId, slots.length, rows]);

  const items = virtualizer.getVirtualItems();
  // Distance from the real scroll position, not the first virtual index: a prepend
  // adjusts scrollY in the layout effect above, and this effect runs after that.
  useEffect(() => {
    if (!armed) return;
    let timer = 0;
    const check = () => {
      const y = window.scrollY;
      const listTop = listRef.current ? listRef.current.getBoundingClientRect().top + y : scrollMargin;
      const distanceToStart = y + 120 - listTop;
      const distanceToEnd = listTop + virtualizerRef.current.getTotalSize() - (y + window.innerHeight);
      if (distanceToStart < 520) onNearStart?.();
      if (distanceToEnd < 720) onNearEnd?.();
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 80);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [armed, slots.length, scrollMargin, onNearStart, onNearEnd]);

  useEffect(() => {
    if (!onTopVerse || !armed) return;
    let timer = 0;
    const save = () => {
      const y = window.scrollY + 72;
      for (const item of virtualizerRef.current.getVirtualItems()) {
        if (scrollMargin + item.start + item.size < y) continue;
        const slot = slots[item.index];
        if (slot?.kind === "row" && slot.row.kind === "verse") onTopVerse(slot.row.shloka.verse_label);
        return;
      }
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onTopVerse, armed, slots, scrollMargin]);

  return (
    <div ref={listRef} className="w-full overflow-x-clip">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const slot = slots[item.index];
          if (!slot) return null;
          return (
            <div
              key={slot.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="w-full"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
            >
              {slot.kind === "edge" ? (
                <p className={documentsClasses.edgeNote}>{loadingLabel}</p>
              ) : (
                <div className="pb-2">
                  <RowView row={slot.row} versePlayer={versePlayer} fullRecording={fullRecording} suktaAudio={suktaAudio} clipConfirmed={clipConfirmed} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
