import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { usePlaybackBar, useShlokaCard } from "@vedic-patro/features/documents";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import type { DocumentGroupHeadingProps, PlaybackBarProps, ShlokaCardProps } from "../contract";
import { iconChevronDown, iconChevronUp, iconHeadphones, iconListMusic, iconPause, iconPlay, iconSkipBack, iconSkipForward, iconX } from "../icons";

/** Full width, just above the phone layout's bottom bar; at the foot of the window on a wide screen. */
const DOCK = "fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-0";

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
    const start = bar.idle.startsFull ? props.onStartFull : () => props.onPlayThrough?.();
    return (
      <Band>
        <button type="button" onClick={start} aria-label={bar.idle.title} className={documentsClasses.barPlay}>
          <Icon node={iconPlay} size={16} tone="onBrand" filled className="ml-0.5" />
        </button>
        <button type="button" onClick={start} className={cn(documentsClasses.fill, "text-left")}>
          <BarHead kicker={props.documentTitle} title={bar.idle.title} />
        </button>
        <span className={cn(documentsClasses.barSkip, "pointer-events-none")} aria-hidden="true">
          <Icon node={iconHeadphones} size={16} tone="onBrand" />
        </span>
      </Band>
    );
  }
  if (bar.face === "full") {
    return (
      <Band>
        <SkipButton icon={iconSkipBack} label={copy.prevTrack} disabled={!props.hasPrevFull} onClick={props.onPrevFull} />
        <button type="button" onClick={props.onToggleFull} aria-label={bar.full.toggleLabel} className={documentsClasses.barPlay}>
          <Icon node={bar.full.playing ? iconPause : iconPlay} size={16} tone="onBrand" filled className={bar.full.playing ? undefined : "ml-0.5"} />
        </button>
        <SkipButton icon={iconSkipForward} label={copy.nextTrack} disabled={!props.hasNextFull} onClick={props.onNextFull} />
        <div className={documentsClasses.fill}>
          <TitleLink open={props.open}>
            <BarHead kicker={bar.full.kicker} title={bar.full.heading} />
          </TitleLink>
          <div className={documentsClasses.barScrubRow}>
            <span className={documentsClasses.barTime}>{bar.full.current}</span>
            <input
              type="range"
              className="shloka-scrub shloka-scrub-band w-full min-w-0 flex-1 cursor-pointer outline-none"
              style={{ ["--fill" as string]: `${bar.full.fillPct}%` }}
              min={0}
              max={props.fullDuration || 1}
              step={0.1}
              value={Math.min(fullTime, props.fullDuration || 1)}
              {...scrub.inputProps}
              aria-label={copy.seek}
            />
            <span className={cn(documentsClasses.barTime, "text-right")}>{bar.full.total}</span>
          </div>
        </div>
        <CloseButton close={props.close} />
      </Band>
    );
  }
  return (
    <Band>
      <SkipButton icon={iconSkipBack} label={copy.prevVerse} disabled={!props.hasPrev} onClick={props.onPrev} />
      <button type="button" onClick={props.onToggleVerse} disabled={!bar.verse.hasClip} aria-label={bar.verse.toggleLabel} className={cn(documentsClasses.barPlay, "disabled:opacity-40")}>
        <Icon node={bar.verse.playing ? iconPause : iconPlay} size={16} tone="onBrand" filled className={bar.verse.playing ? undefined : "ml-0.5"} />
      </button>
      <SkipButton icon={iconSkipForward} label={copy.nextVerse} disabled={!props.hasNext} onClick={props.onNext} />
      <div className={documentsClasses.fill}>
        <TitleLink open={props.open}>
          <BarHead kicker={bar.verse.kicker} title={bar.verse.title} />
        </TitleLink>
        {bar.verse.hasClip ? (
          <div className={documentsClasses.barScrubRow}>
            <span className={documentsClasses.barTime}>{bar.verse.current}</span>
            <div className={documentsClasses.barTrack}>
              <div className={cn(documentsClasses.barTrackFill, "transition-[width]")} style={{ width: `${bar.verse.fillPct}%` }} />
            </div>
            <span className={cn(documentsClasses.barTime, "text-right")}>{bar.verse.total}</span>
          </div>
        ) : null}
      </div>
      {bar.verse.canSwitchToFull ? <SkipButton icon={iconListMusic} label={copy.switchToFull} onClick={props.onSwitchToFull} /> : null}
      <CloseButton close={props.close} />
    </Band>
  );
}

function Band({ children }: { children: ReactNode }) {
  return (
    <div className={DOCK}>
      <div className={documentsClasses.barShell}>
        <div className={cn(documentsClasses.barInner, documentsClasses.barRow)}>{children}</div>
      </div>
    </div>
  );
}

/** The title line: the gold kicker ("ऋग्वेद") then the title ("सूक्त १.२"). */
function BarHead({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <span className={documentsClasses.barHead}>
      {kicker ? <span className={documentsClasses.barKicker}>{kicker}</span> : null}
      <span className={cn(documentsClasses.barTitle, "truncate")}>{title}</span>
    </span>
  );
}

function SkipButton({ icon, label, disabled, onClick }: { icon: typeof iconPlay; label: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label}
      title={label}
      className={cn(documentsClasses.barSkip, documentsClasses.barSkipHover, "disabled:opacity-30 disabled:hover:bg-transparent")}
    >
      <Icon node={icon} size={16} tone="onBrand" filled={icon !== iconListMusic} />
    </button>
  );
}

/** The player's title: on another page, a click goes back to the text it is reading. */
function TitleLink({ open, children }: { open: PlaybackBarProps["open"]; children: ReactNode }) {
  if (!open) return <div className="min-w-0">{children}</div>;
  return (
    <button type="button" onClick={open.onPress} title={open.hint} className="block w-full min-w-0 text-left">
      {children}
    </button>
  );
}

/** Stop and close the player. */
function CloseButton({ close }: { close: PlaybackBarProps["close"] }) {
  if (!close) return null;
  return (
    <button type="button" onClick={close.onPress} aria-label={close.label} title={close.label} className={cn(documentsClasses.barSkip, documentsClasses.barSkipHover, "ml-1")}>
      <Icon node={iconX} size={16} tone="onBrand" />
    </button>
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
