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
  inset = 12,
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
  if (bar.face === "idle") {
    return (
      <Dock bottom={bottom} inset={props.dockInset} onHeight={props.onDockHeight}>
        <Pressable onPress={bar.idle.startsFull ? props.onStartFull : () => props.onPlayThrough?.()} className={cn(documentsClasses.barShell, documentsClasses.barPadIdle, documentsClasses.barRow)}>
          <Box className={documentsClasses.barPlay}>
            <Icon node={iconPlay} size={20} tone="onSecondary" filled />
          </Box>
          <Box className={documentsClasses.fill}>
            <Text className={documentsClasses.barTitle} numberOfLines={1}>{bar.idle.title}</Text>
            <Text className={documentsClasses.barSubtitle} numberOfLines={1}>{props.documentTitle}</Text>
          </Box>
          <Icon node={iconHeadphones} size={16} tone="muted" />
        </Pressable>
      </Dock>
    );
  }
  if (bar.face === "full") {
    return (
      <Dock bottom={bottom} inset={props.dockInset} onHeight={props.onDockHeight}>
        <Box className={cn(documentsClasses.barShell, documentsClasses.barPad, documentsClasses.barRow)}>
          <Pressable onPress={props.onToggleFull} label={bar.full.toggleLabel} className={documentsClasses.barPlay}>
            <Icon node={bar.full.playing ? iconPause : iconPlay} size={20} tone="onSecondary" filled />
          </Pressable>
          <Box className={documentsClasses.fill}>
            <TitleLink open={props.open}>
              <Text className={documentsClasses.barKicker} numberOfLines={1}>{bar.full.title}</Text>
            </TitleLink>
            <Box className={documentsClasses.barScrubRow} nativeClassName="flex-row items-center">
              <Text className={documentsClasses.barTime}>{bar.full.current}</Text>
              {props.renderSeek ? (
                props.renderSeek({ value: props.fullCurrentTime, max: props.fullDuration || 1, fillPct: bar.full.fillPct, label: copy.seek, onChange: props.onSeekFull })
              ) : (
                <Box className={cn(documentsClasses.barTrack, "flex-1")}>
                  <Box className={documentsClasses.barTrackFill} widthPercent={bar.full.fillPct} />
                </Box>
              )}
              <Text className={documentsClasses.barTime}>{bar.full.total}</Text>
            </Box>
          </Box>
          <CloseButton close={props.close} />
        </Box>
      </Dock>
    );
  }
  if (!props.activeShloka) return null;
  return (
    <Dock bottom={bottom} inset={props.dockInset} onHeight={props.onDockHeight}>
      <Box className={cn(documentsClasses.barShell, documentsClasses.barPad)}>
        {bar.verse.hasClip ? (
          <Box className={cn(documentsClasses.barScrubRow, "mb-1.5")} nativeClassName="flex-row items-center">
            <Text className={documentsClasses.barTime}>{bar.verse.current}</Text>
            <Box className={documentsClasses.barTrack}>
              <Box className={documentsClasses.barTrackFill} widthPercent={bar.verse.fillPct} />
            </Box>
            <Text className={documentsClasses.barTime}>{bar.verse.total}</Text>
          </Box>
        ) : null}
        <Box className={documentsClasses.barRow} nativeClassName="flex-row">
          <Pressable onPress={props.onPrev} disabled={!props.hasPrev} label={copy.prevVerse} className={cn(documentsClasses.barSkip, !props.hasPrev && "opacity-30")}>
            <Icon node={iconSkipBack} size={16} tone="muted" filled />
          </Pressable>
          <Pressable onPress={props.onToggleVerse} disabled={!bar.verse.hasClip} label={bar.verse.toggleLabel} className={cn(documentsClasses.barPlay, !bar.verse.hasClip && "opacity-40")}>
            <Icon node={bar.verse.playing ? iconPause : iconPlay} size={20} tone="onSecondary" filled />
          </Pressable>
          <Pressable onPress={props.onNext} disabled={!props.hasNext} label={copy.nextVerse} className={cn(documentsClasses.barSkip, !props.hasNext && "opacity-30")}>
            <Icon node={iconSkipForward} size={16} tone="muted" filled />
          </Pressable>
          <Box className={documentsClasses.fill}>
            <TitleLink open={props.open}>
              <Text className={documentsClasses.barKicker} numberOfLines={1}>{bar.verse.kicker}</Text>
              <Text className={documentsClasses.barTitle} numberOfLines={1}>{bar.verse.title}</Text>
            </TitleLink>
          </Box>
          {bar.verse.canSwitchToFull ? (
            <Pressable onPress={props.onSwitchToFull} label={copy.switchToFull} className={documentsClasses.barSkip}>
              <Icon node={iconListMusic} size={16} tone="muted" />
            </Pressable>
          ) : null}
          <CloseButton close={props.close} />
        </Box>
      </Box>
    </Dock>
  );
}

/** The mini player's title: a tap goes back to the text it is reading. Plain text on the page itself. */
function TitleLink({ open, children }: { open: PlaybackBarProps["open"]; children: React.ReactNode }) {
  if (!open) return <>{children}</>;
  return (
    <Pressable onPress={open.onPress} label={open.hint} suppressPressScale>
      <Box>{children}</Box>
    </Pressable>
  );
}

/** The mini player's X: stop and close. Only on other pages. */
function CloseButton({ close }: { close: PlaybackBarProps["close"] }) {
  if (!close) return null;
  return (
    <Pressable onPress={close.onPress} label={close.label} className={documentsClasses.barSkip}>
      <Icon node={iconX} size={18} tone="muted" />
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
