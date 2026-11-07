import { useEffect, useRef, useState } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { usePlaybackBar, useShlokaCard } from "@vedic-patro/features/documents";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import type { DocumentGroupHeadingProps, PlaybackBarProps, ShlokaCardProps } from "../contract";
import { iconChevronDown, iconChevronUp, iconHeadphones, iconListMusic, iconPause, iconPlay, iconSkipBack, iconSkipForward } from "../icons";

const DOCK = "fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4";

export function ShlokaCard({ shloka, isActive, isPlaying, progress, meaningOpen, playsFromFull, clip, onPlay, onToggleMeaning, onDetail, registerRef }: ShlokaCardProps) {
  const card = useShlokaCard({ shloka, isActive, isPlaying, playsFromFull, progress, clip });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;
  return (
    <section
      ref={(node) => registerRef?.(node)}
      id={card.domId}
      className={cn(
        documentsClasses.verseCard,
        "scroll-mt-24 min-w-0 max-w-full transition-colors",
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <Box className={documentsClasses.verseDetails}>
        {isNote ? null : <Text as="span" className={documentsClasses.verseNumberPlain}>{card.label}</Text>}
        {card.details.map((d) => {
          const body = (
            <>
              <span className={documentsClasses.verseDetailLabel}>{d.label}</span>
              <span className={documentsClasses.verseDetailValue}>{d.value}</span>
            </>
          );
          return onDetail ? (
            <button key={d.kind} type="button" onClick={() => onDetail(d.kind, d.value)} className={documentsClasses.verseDetailItem}>
              {body}
            </button>
          ) : (
            <span key={d.kind} className={documentsClasses.verseDetailItem}>
              {body}
            </span>
          );
        })}
        {vedaCite ? <Text as="span" className={documentsClasses.verseCite}>{vedaCite}</Text> : null}
      </Box>
      <Box className={documentsClasses.verseRow}>
        {canPlay ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={card.copy.play}
            className={cn(documentsClasses.versePlay, isActive ? documentsClasses.versePlayActive : documentsClasses.versePlayIdle)}
          >
            <Icon node={isPlaying ? iconPause : iconPlay} size={15} tone="onSecondary" filled className={isPlaying ? undefined : "ml-0.5"} />
          </button>
        ) : null}
        <Box className={documentsClasses.verseBody}>
          {card.svaraLine.length > 0 ? (
            <>
              <p className={cn(documentsClasses.verseTextWeb, "flex flex-wrap items-end gap-x-0.5")}>
                {card.svaraLine.map((piece, i) =>
                  piece.marks ? (
                    <span key={i} className="inline-flex flex-col items-center">
                      <span className="text-diagram-xs leading-none text-muted-foreground">{piece.marks}</span>
                      <span>{piece.text}</span>
                    </span>
                  ) : (
                    <span key={i}>{piece.text}</span>
                  ),
                )}
              </p>
              <Text as="p" className={documentsClasses.verseDetailLabel}>{card.copy.swaraLess}</Text>
            </>
          ) : null}
          <Text as="p" className={cn(isNote ? documentsClasses.verseTextNote : documentsClasses.verseTextWeb, isNote ? undefined : "whitespace-normal")}>
            {card.tokens.map((tok, i) =>
              i === card.activeTokenIndex ? (
                <Text as="span" key={i} className={cn(documentsClasses.verseWord, "transition-colors duration-150")}>{tok}</Text>
              ) : (
                tok
              ),
            )}
          </Text>
          {card.transliteration ? <Text as="p" className={documentsClasses.verseTranslit}>{card.transliteration}</Text> : null}
        </Box>
      </Box>
      {isActive ? (
        <Box className={documentsClasses.verseProgress}>
          <Box className={documentsClasses.verseProgressFill} webClassName="transition-[width]" widthPercent={card.progressPct} />
        </Box>
      ) : null}
      {meaning ? (
        <Box className={documentsClasses.verseMeaningWrap}>
          <button type="button" onClick={onToggleMeaning} aria-expanded={meaningOpen} className={cn(documentsClasses.verseMeaningToggle, documentsClasses.verseMeaningToggleText, "inline-flex items-center")}>
            {card.copy.meaning}
            <Icon node={meaningOpen ? iconChevronUp : iconChevronDown} size={16} tone="secondary" />
          </button>
          {meaningOpen ? <Text as="p" className={cn(documentsClasses.verseMeaning, "whitespace-pre-line")}>{meaning}</Text> : null}
        </Box>
      ) : null}
    </section>
  );
}

/**
 * Where the thumb is while the listener drags it. The recording seeks once, on release:
 * seeking on every input event fired a new range request per pixel on an hours-long file,
 * and the next timeupdate pulled the thumb back to the old position mid-drag.
 */
function useScrubDrag(onSeek: (time: number) => void) {
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const pointerDown = useRef(false);
  const onSeekRef = useRef(onSeek);
  useEffect(() => {
    onSeekRef.current = onSeek;
  });
  const release = useRef(() => {
    pointerDown.current = false;
    const at = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (at != null) onSeekRef.current(at);
  });
  // The pointer can come up outside the slider; listen on the window while a drag is on.
  useEffect(() => {
    const end = release.current;
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  return {
    drag,
    inputProps: {
      onPointerDown: () => {
        pointerDown.current = true;
        window.addEventListener("pointerup", release.current, { once: true });
        window.addEventListener("pointercancel", release.current, { once: true });
      },
      onChange: (event: { currentTarget: HTMLInputElement }) => {
        const at = Number(event.currentTarget.value);
        // Keyboard arrows seek right away; a pointer drag waits for release.
        if (!pointerDown.current) {
          onSeekRef.current(at);
          return;
        }
        dragRef.current = at;
        setDrag(at);
      },
    },
  };
}

export function PlaybackBar(props: PlaybackBarProps) {
  const scrub = useScrubDrag(props.onSeekFull);
  const fullTime = scrub.drag ?? props.fullCurrentTime;
  const bar = usePlaybackBar({
    mode: props.mode,
    hasFullRecording: props.hasFullRecording,
    hasSuktaAudio: props.hasSuktaAudio,
    suktaNumber: props.suktaNumber,
    suktaLabel: props.suktaLabel,
    documentTitle: props.documentTitle,
    chapterTitle: props.chapterTitle,
    canPlayThrough: Boolean(props.onPlayThrough),
    full: { playing: props.fullPlaying, currentTime: fullTime, duration: props.fullDuration },
    verse: { playing: props.versePlaying, currentTime: props.verseCurrentTime, duration: props.verseDuration },
    activeShloka: props.activeShloka,
  });
  const { copy } = bar;
  if (bar.face === "hidden") return null;
  if (bar.face === "idle") {
    return (
      <div className={DOCK}>
        <button
          type="button"
          onClick={bar.idle.startsFull ? props.onStartFull : () => props.onPlayThrough?.()}
          className={cn(documentsClasses.barShell, documentsClasses.barPadIdle, documentsClasses.barRow, "text-left backdrop-blur transition-colors hover:border-secondary/60")}
        >
          <span className={cn(documentsClasses.barPlay, "text-secondary-foreground")}>
            <Icon node={iconPlay} size={20} tone="onSecondary" filled className="ml-0.5" />
          </span>
          <span className={documentsClasses.fill}>
            <span className={cn(documentsClasses.barTitle, "block truncate")}>{bar.idle.title}</span>
            <span className={cn(documentsClasses.barSubtitle, "block truncate")}>{props.documentTitle}</span>
          </span>
          <Icon node={iconHeadphones} size={16} tone="muted" />
        </button>
      </div>
    );
  }
  if (bar.face === "full") {
    return (
      <div className={DOCK}>
        <Box className={cn(documentsClasses.barShell, documentsClasses.barPad, documentsClasses.barRow, "backdrop-blur")}>
          <button type="button" onClick={props.onToggleFull} aria-label={bar.full.toggleLabel} className={cn(documentsClasses.barPlay, "text-secondary-foreground")}>
            <Icon node={bar.full.playing ? iconPause : iconPlay} size={20} tone="onSecondary" filled className={bar.full.playing ? undefined : "ml-0.5"} />
          </button>
          <Box className={documentsClasses.fill}>
            <Text as="p" className={cn(documentsClasses.barKicker, "truncate")}>{bar.full.title}</Text>
            <Box className={documentsClasses.barScrubRow}>
              <Text as="span" className={documentsClasses.barTime}>{bar.full.current}</Text>
              <input
                type="range"
                className="shloka-scrub w-full min-w-0 flex-1 cursor-pointer outline-none"
                style={{ ["--fill" as string]: `${bar.full.fillPct}%` }}
                min={0}
                max={props.fullDuration || 1}
                step={0.1}
                value={Math.min(fullTime, props.fullDuration || 1)}
                {...scrub.inputProps}
                aria-label={copy.seek}
              />
              <Text as="span" className={documentsClasses.barTime}>{bar.full.total}</Text>
            </Box>
          </Box>
        </Box>
      </div>
    );
  }
  return (
    <div className={DOCK}>
      <Box className={cn(documentsClasses.barShell, documentsClasses.barPad, "backdrop-blur")}>
        {bar.verse.hasClip ? (
          <Box className="mb-1.5 flex items-center gap-2">
            <Text as="span" className={cn(documentsClasses.barTime, "text-right")}>{bar.verse.current}</Text>
            <Box className={cn(documentsClasses.barTrack, "shloka-scrub")}>
              <Box className={documentsClasses.barTrackFill} webClassName="transition-[width]" widthPercent={bar.verse.fillPct} />
            </Box>
            <Text as="span" className={documentsClasses.barTime}>{bar.verse.total}</Text>
          </Box>
        ) : null}
        <Box className={documentsClasses.barRow}>
          <button type="button" onClick={props.onPrev} disabled={!props.hasPrev} aria-label={copy.prevVerse} className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}>
            <Icon node={iconSkipBack} size={16} tone="muted" filled />
          </button>
          <button type="button" onClick={props.onToggleVerse} disabled={!bar.verse.hasClip} aria-label={bar.verse.toggleLabel} className={cn(documentsClasses.barPlay, "text-secondary-foreground disabled:opacity-40")}>
            <Icon node={bar.verse.playing ? iconPause : iconPlay} size={20} tone="onSecondary" filled className={bar.verse.playing ? undefined : "ml-0.5"} />
          </button>
          <button type="button" onClick={props.onNext} disabled={!props.hasNext} aria-label={copy.nextVerse} className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground disabled:opacity-30")}>
            <Icon node={iconSkipForward} size={16} tone="muted" filled />
          </button>
          <Box className={documentsClasses.fill}>
            <Text as="p" className={cn(documentsClasses.barKicker, "truncate")}>{bar.verse.kicker}</Text>
            <Text as="p" className={cn(documentsClasses.barTitle, "truncate")}>{bar.verse.title}</Text>
          </Box>
          {bar.verse.canSwitchToFull ? (
            <button type="button" onClick={props.onSwitchToFull} aria-label={copy.switchToFull} title={copy.switchToFull} className={cn(documentsClasses.barSkip, "text-muted-foreground hover:text-foreground")}>
              <Icon node={iconListMusic} size={16} tone="muted" />
            </button>
          ) : null}
        </Box>
      </Box>
    </div>
  );
}

/** A sukta or chapter heading; with `play`, a play button and a "play full sukta" note on the same row. */
export function DocumentGroupHeading({ heading, meta, kind = "sukta", play }: DocumentGroupHeadingProps) {
  const { t } = useLocale();
  const note = kind === "chapter" ? t("documents.play_full_chapter") : t("documents.play_full_sukta");
  const title = <h2 className={kind === "chapter" ? documentsClasses.groupHeadChapter : documentsClasses.suktaLabel}>{heading}</h2>;
  return (
    <div className="pt-3">
      {play ? (
        <button
          type="button"
          onClick={play.onPress}
          aria-label={play.playing ? t("documents.pause_group") : `${heading} — ${note}`}
          className={cn(documentsClasses.groupHead, "text-left")}
        >
          <span className={cn(documentsClasses.versePlay, documentsClasses.versePlayIdle)}>
            <Icon node={play.playing ? iconPause : iconPlay} size={15} tone="onSecondary" filled className={play.playing ? undefined : "ml-0.5"} />
          </span>
          {title}
          <span className={documentsClasses.groupPlayNote}>{play.playing ? t("documents.pause_group") : note}</span>
        </button>
      ) : (
        title
      )}
      {meta ? <p className={documentsClasses.suktaMeta}>{meta}</p> : null}
    </div>
  );
}
