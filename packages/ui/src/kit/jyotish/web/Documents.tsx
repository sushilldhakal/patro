import { cn } from "@vedic-patro/domain/utils";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { usePlaybackBar, useShlokaCard } from "@vedic-patro/features/documents";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { PlaybackBarProps, ShlokaCardProps } from "../contract";
import { iconChevronDown, iconChevronUp, iconHeadphones, iconListMusic, iconPause, iconPlay, iconSkipBack, iconSkipForward } from "../icons";

const DOCK = "fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3 lg:bottom-4";

export function ShlokaCard({ shloka, isActive, isPlaying, progress, meaningOpen, playsFromFull, clip, onPlay, onToggleMeaning, registerRef }: ShlokaCardProps) {
  const card = useShlokaCard({ shloka, isActive, isPlaying, playsFromFull, progress, clip });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;
  return (
    <section
      ref={(node) => registerRef?.(node)}
      id={card.domId}
      className={cn(
        documentsClasses.verse,
        "scroll-mt-24 min-w-0 max-w-full [overflow-wrap:anywhere] transition-colors",
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <Box className={documentsClasses.verseRow}>
        {canPlay ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={card.copy.play}
            className={cn(
              documentsClasses.versePlay,
              "transition-colors",
              isActive ? documentsClasses.versePlayActive : cn(documentsClasses.versePlayIdle, "hover:opacity-90"),
            )}
          >
            <Icon node={isPlaying ? iconPause : iconPlay} size={16} tone="onSecondary" filled className={isPlaying ? undefined : "ml-0.5"} />
          </button>
        ) : (
          <Text as="span" className={cn(documentsClasses.verseLabelSlot, documentsClasses.verseLabelSlotText)}>{shloka.verse_label}</Text>
        )}
        <Box className={documentsClasses.fill}>
          {canPlay || vedaCite ? (
            <Box className={documentsClasses.verseMetaRow}>
              {canPlay ? <Text as="span" className={cn(documentsClasses.verseBadge, documentsClasses.verseBadgeText)}>{shloka.verse_label}</Text> : <span />}
              {vedaCite ? <Text as="span" className={documentsClasses.verseCite}>{vedaCite}</Text> : null}
            </Box>
          ) : null}
          <Text as="p" className={cn(isNote ? documentsClasses.verseTextNote : documentsClasses.verseText, isNote && "whitespace-pre-line")}>
            {card.tokens.map((tok, i) =>
              i === card.activeTokenIndex ? (
                <Text as="span" key={i} className={cn(documentsClasses.verseWord, "transition-colors duration-150")}>{tok}</Text>
              ) : (
                tok
              ),
            )}
          </Text>
          {card.transliteration ? <Text as="p" className={documentsClasses.verseTranslit}>{card.transliteration}</Text> : null}
          {isActive ? (
            <Box className={documentsClasses.verseProgress}>
              <Box className={documentsClasses.verseProgressFill} webClassName="transition-[width]" widthPercent={card.progressPct} />
            </Box>
          ) : null}
          {meaning ? (
            <Box className={documentsClasses.verseMeaningWrap}>
              <button type="button" onClick={onToggleMeaning} aria-expanded={meaningOpen} className={cn(documentsClasses.verseMeaningToggle, documentsClasses.verseMeaningToggleText, "inline-flex w-fit items-center hover:no-underline")}>
                {card.copy.meaning}
                <Icon node={meaningOpen ? iconChevronUp : iconChevronDown} size={16} tone="secondary" />
              </button>
              {meaningOpen ? <Text as="p" className={cn(documentsClasses.verseMeaning, "whitespace-pre-line")}>{meaning}</Text> : null}
            </Box>
          ) : null}
        </Box>
      </Box>
    </section>
  );
}

export function PlaybackBar(props: PlaybackBarProps) {
  const bar = usePlaybackBar({
    mode: props.mode,
    hasFullRecording: props.hasFullRecording,
    canPlayThrough: Boolean(props.onPlayThrough),
    full: { playing: props.fullPlaying, currentTime: props.fullCurrentTime, duration: props.fullDuration },
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
            <Text as="p" className={cn(documentsClasses.barKicker, "truncate")}>{copy.playFull}</Text>
            <Box className={documentsClasses.barScrubRow}>
              <Text as="span" className={documentsClasses.barTime}>{bar.full.current}</Text>
              <input
                type="range"
                className="shloka-scrub w-full min-w-0 flex-1 cursor-pointer outline-none"
                style={{ ["--fill" as string]: `${bar.full.fillPct}%` }}
                min={0}
                max={props.fullDuration || 1}
                step={0.1}
                value={props.fullCurrentTime}
                onChange={(event) => props.onSeekFull(Number(event.target.value))}
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
            <Text as="p" className={cn(documentsClasses.barKicker, "truncate")}>{props.documentTitle}</Text>
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
