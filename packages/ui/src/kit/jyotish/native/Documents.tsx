import { useEffect } from "react";
import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { usePlaybackBar, useShlokaCard } from "@vedic-patro/features/documents";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import type { DocumentGroupHeadingProps, PlaybackBarProps, ShlokaCardProps } from "../contract";
import { iconChevronDown, iconChevronUp, iconHeadphones, iconListMusic, iconPause, iconPlay, iconSkipBack, iconSkipForward, iconX } from "../icons";

export function ShlokaCard({ shloka, isActive, isPlaying, progress, meaningOpen, playsFromFull, clip, onPlay, onToggleMeaning, onDetail }: ShlokaCardProps) {
  const card = useShlokaCard({ shloka, isActive, isPlaying, playsFromFull, progress, clip });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;
  return (
    <Box
      className={cn(
        documentsClasses.verse,
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <Box className={documentsClasses.verseDetails} nativeClassName="flex-row flex-wrap items-baseline">
        {isNote ? null : <Text className={documentsClasses.verseNumberPlain}>{card.label}</Text>}
        {card.details.map((d) => (
          <Box key={d.kind} className={documentsClasses.verseDetailItem} nativeClassName="flex-row items-baseline">
            <Text className={documentsClasses.verseDetailLabel}>{d.label}</Text>
            {onDetail ? (
              <Pressable onPress={() => onDetail(d.kind, d.value)} label={`${d.label} ${d.value}`} suppressPressScale>
                <Text className={documentsClasses.verseDetailValue}>{d.value}</Text>
              </Pressable>
            ) : (
              <Text className={documentsClasses.verseDetailValue}>{d.value}</Text>
            )}
          </Box>
        ))}
        {vedaCite ? <Text className={documentsClasses.verseCite}>{vedaCite}</Text> : null}
      </Box>
      <Box className={documentsClasses.verseRow} nativeClassName="flex-row items-start">
        {canPlay ? (
          <Pressable onPress={onPlay} label={card.copy.play} className={cn(documentsClasses.versePlay, isActive ? documentsClasses.versePlayActive : documentsClasses.versePlayIdle)}>
            <Icon node={isPlaying ? iconPause : iconPlay} size={15} tone="onSecondary" filled />
          </Pressable>
        ) : null}
        <Box className={documentsClasses.verseBody}>
          {card.svaraLine.length > 0 ? (
            <Box>
              <Box nativeClassName="flex-row flex-wrap items-end">
                {card.svaraLine.map((piece, i) =>
                  piece.marks ? (
                    <Box key={i} nativeClassName="items-center">
                      <Text className={documentsClasses.verseDetailLabel}>{piece.marks}</Text>
                      <Text className={documentsClasses.verseText}>{piece.text}</Text>
                    </Box>
                  ) : (
                    <Text key={i} className={documentsClasses.verseText}>{piece.text}</Text>
                  ),
                )}
              </Box>
              <Text className={documentsClasses.verseDetailLabel}>{card.copy.swaraLess}</Text>
            </Box>
          ) : null}
          <Text className={cn(isNote ? documentsClasses.verseTextNote : documentsClasses.verseText)}>
            {card.tokens.map((tok, i) =>
              i === card.activeTokenIndex ? (
                <Text key={i} className={cn(documentsClasses.verseWord, isNote ? documentsClasses.verseTextNote : documentsClasses.verseText)}>{tok}</Text>
              ) : (
                tok
              ),
            )}
          </Text>
          {card.transliteration ? <Text className={documentsClasses.verseTranslit}>{card.transliteration}</Text> : null}
        </Box>
      </Box>
      {isActive ? (
        <Box className={documentsClasses.verseProgress}>
          <Box className={documentsClasses.verseProgressFill} widthPercent={card.progressPct} />
        </Box>
      ) : null}
      {meaning ? (
        <Box className={documentsClasses.verseMeaningWrap}>
          <Pressable onPress={onToggleMeaning} className={documentsClasses.verseMeaningToggle} nativeClassName="flex-row items-center self-start">
            <Text className={documentsClasses.verseMeaningToggleText}>{card.copy.meaning}</Text>
            <Icon node={meaningOpen ? iconChevronUp : iconChevronDown} size={16} tone="secondary" />
          </Pressable>
          {meaningOpen ? <Text className={documentsClasses.verseMeaning}>{meaning}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}

function Dock({
  children,
  bottom,
  inset = 0,
  onHeight,
}: {
  children: React.ReactNode;
  bottom: number;
  inset?: number;
  onHeight?: (height: number) => void;
}) {
  useEffect(() => () => onHeight?.(0), [onHeight]);
  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={{ position: "absolute", left: inset, right: inset, bottom, alignItems: "center" }}
    >
      {children}
    </View>
  );
}

export function PlaybackBar(props: PlaybackBarProps) {
  const bar = usePlaybackBar({
    mode: props.mode,
    hasFullRecording: props.hasFullRecording,
    hasSuktaAudio: props.hasSuktaAudio,
    suktaNumber: props.suktaNumber,
    suktaLabel: props.suktaLabel,
    documentTitle: props.documentTitle,
    chapterTitle: props.chapterTitle,
    canPlayThrough: Boolean(props.onPlayThrough),
    full: { playing: props.fullPlaying, currentTime: props.fullCurrentTime, duration: props.fullDuration },
    verse: { playing: props.versePlaying, currentTime: props.verseCurrentTime, duration: props.verseDuration },
    activeShloka: props.activeShloka,
  });
  const { copy } = bar;
  const bottom = props.dockBottom ?? 16;
  if (bar.face === "hidden") return null;
  const dock = (edge: React.ReactNode, children: React.ReactNode) => (
    <Dock bottom={bottom} inset={props.dockInset} onHeight={props.onDockHeight}>
      <Box className={documentsClasses.barShell}>
        <Box className={cn(documentsClasses.barInner, documentsClasses.barRow)} nativeClassName="flex-row items-center">
          {children}
        </Box>
        {edge}
      </Box>
    </Dock>
  );
  if (bar.face === "idle") {
    const start = bar.idle.startsFull ? props.onStartFull : () => props.onPlayThrough?.();
    return dock(
      null,
      <>
        <Pressable onPress={start} label={bar.idle.title} className={documentsClasses.barPlay}>
          <Icon node={iconPlay} size={20} tone="onBrand" filled />
        </Pressable>
        <Pressable onPress={start} label={bar.idle.title} suppressPressScale className={documentsClasses.fill}>
          <BarText kicker={props.documentTitle} title={bar.idle.title} />
        </Pressable>
        <Box className={documentsClasses.barSkip}>
          <Icon node={iconHeadphones} size={18} tone="onBrand" />
        </Box>
      </>,
    );
  }
  if (bar.face === "full") {
    const max = props.fullDuration || 1;
    return dock(
      <Edge fillPct={bar.full.fillPct}>
        {props.renderSeek ? props.renderSeek({ value: props.fullCurrentTime, max, fillPct: bar.full.fillPct, label: copy.seek, onChange: props.onSeekFull }) : null}
      </Edge>,
      <>
        <SkipButton icon={iconSkipBack} label={copy.prevTrack} disabled={!props.hasPrevFull} onPress={props.onPrevFull} />
        <Pressable onPress={props.onToggleFull} label={bar.full.toggleLabel} className={documentsClasses.barPlay}>
          <Icon node={bar.full.playing ? iconPause : iconPlay} size={20} tone="onBrand" filled />
        </Pressable>
        <SkipButton icon={iconSkipForward} label={copy.nextTrack} disabled={!props.hasNextFull} onPress={props.onNextFull} />
        <TitleLink open={props.open}>
          <BarText kicker={bar.full.kicker} title={bar.full.heading} />
        </TitleLink>
        <CloseButton close={props.close} />
      </>,
    );
  }
  if (!props.activeShloka) return null;
  return dock(
    bar.verse.hasClip ? <Edge fillPct={bar.verse.fillPct} /> : null,
    <>
      <SkipButton icon={iconSkipBack} label={copy.prevVerse} disabled={!props.hasPrev} onPress={props.onPrev} />
      <Pressable onPress={props.onToggleVerse} disabled={!bar.verse.hasClip} label={bar.verse.toggleLabel} className={cn(documentsClasses.barPlay, !bar.verse.hasClip && "opacity-40")}>
        <Icon node={bar.verse.playing ? iconPause : iconPlay} size={20} tone="onBrand" filled />
      </Pressable>
      <SkipButton icon={iconSkipForward} label={copy.nextVerse} disabled={!props.hasNext} onPress={props.onNext} />
      <TitleLink open={props.open}>
        <BarText kicker={bar.verse.kicker} title={bar.verse.title} />
      </TitleLink>
      {bar.verse.canSwitchToFull ? <SkipButton icon={iconListMusic} label={copy.switchToFull} onPress={props.onSwitchToFull} /> : null}
      <CloseButton close={props.close} />
    </>,
  );
}

/**
 * The slim progress line along the band's top edge. The app's seek slider (`children`) lies over
 * it, a finger-sized strip centred on the line.
 */
function Edge({ fillPct, children }: { fillPct: number; children?: React.ReactNode }) {
  return (
    <>
      <Box className={documentsClasses.barEdge} nativeClassName="absolute">
        <Box className={documentsClasses.barEdgeFill} widthPercent={fillPct} />
      </Box>
      {children ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: -14, height: 28, flexDirection: "row" }}>{children}</View>
      ) : null}
    </>
  );
}

function BarText({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <>
      {kicker ? (
        <Text className={documentsClasses.barKicker} numberOfLines={1}>
          {kicker}
        </Text>
      ) : null}
      <Text className={documentsClasses.barTitle} numberOfLines={1}>
        {title}
      </Text>
    </>
  );
}

function SkipButton({ icon, label, disabled, onPress }: { icon: typeof iconPlay; label: string; disabled?: boolean; onPress?: () => void }) {
  const off = disabled || !onPress;
  return (
    <Pressable onPress={onPress ?? (() => {})} disabled={off} label={label} className={cn(documentsClasses.barSkip, off && "opacity-30")}>
      <Icon node={icon} size={18} tone="onBrand" filled={icon !== iconListMusic} />
    </Pressable>
  );
}

/** The mini player's title: a tap goes back to the text it is reading. Plain text on the page itself. */
function TitleLink({ open, children }: { open: PlaybackBarProps["open"]; children: React.ReactNode }) {
  if (!open) return <Box className={documentsClasses.fill}>{children}</Box>;
  return (
    <Pressable onPress={open.onPress} label={open.hint} suppressPressScale className={documentsClasses.fill}>
      <Box>{children}</Box>
    </Pressable>
  );
}

/** Stop and close the player. */
function CloseButton({ close }: { close: PlaybackBarProps["close"] }) {
  if (!close) return null;
  return (
    <Pressable onPress={close.onPress} label={close.label} className={cn(documentsClasses.barSkip, "ml-1")}>
      <Icon node={iconX} size={18} tone="onBrand" />
    </Pressable>
  );
}

/** A sukta or chapter heading; with `play`, a play button and a "play full sukta" note on the same row. */
export function DocumentGroupHeading({ heading, meta, kind = "sukta", play }: DocumentGroupHeadingProps) {
  const { t } = useLocale();
  const note = kind === "chapter" ? t("documents.play_full_chapter") : t("documents.play_full_sukta");
  const title = <Text className={kind === "chapter" ? documentsClasses.groupHeadChapter : documentsClasses.suktaLabel}>{heading}</Text>;
  return (
    <Box className="mb-3 mt-3">
      {play ? (
        <Pressable onPress={play.onPress} label={play.playing ? t("documents.pause_group") : `${heading} — ${note}`} suppressPressScale>
          <Box className={documentsClasses.groupHead} nativeClassName="flex-row items-center">
            <Box className={cn(documentsClasses.versePlay, documentsClasses.versePlayIdle)}>
              <Icon node={play.playing ? iconPause : iconPlay} size={15} tone="onSecondary" filled />
            </Box>
            {title}
            <Text className={documentsClasses.groupPlayNote}>{play.playing ? t("documents.pause_group") : note}</Text>
          </Box>
        </Pressable>
      ) : (
        title
      )}
      {meta ? <Text className={documentsClasses.suktaMeta}>{meta}</Text> : null}
    </Box>
  );
}
