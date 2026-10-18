import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { usePlaybackBar, useShlokaCard } from "@vedic-patro/features/documents";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { PlaybackBarProps, ShlokaCardProps } from "../contract";
import { iconChevronDown, iconChevronUp, iconHeadphones, iconListMusic, iconPause, iconPlay, iconSkipBack, iconSkipForward } from "../icons";

export function ShlokaCard({ shloka, isActive, isPlaying, progress, meaningOpen, playsFromFull, clip, onPlay, onToggleMeaning }: ShlokaCardProps) {
  const card = useShlokaCard({ shloka, isActive, isPlaying, playsFromFull, progress, clip });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;
  return (
    <Box
      className={cn(
        documentsClasses.verse,
        "mb-3",
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <Box className={documentsClasses.verseRow} nativeClassName="flex-row">
        {canPlay ? (
          <Pressable onPress={onPlay} label={card.copy.play} className={cn(documentsClasses.versePlay, isActive ? documentsClasses.versePlayActive : documentsClasses.versePlayIdle)}>
            <Icon node={isPlaying ? iconPause : iconPlay} size={16} tone="onSecondary" filled />
          </Pressable>
        ) : (
          <Box className={documentsClasses.verseLabelSlot}>
            <Text className={documentsClasses.verseLabelSlotText}>{shloka.verse_label}</Text>
          </Box>
        )}
        <Box className={documentsClasses.verseBody}>
          {canPlay || vedaCite ? (
            <Box className={documentsClasses.verseMetaRow} nativeClassName="flex-row">
              {canPlay ? (
                <Box className={cn(documentsClasses.verseBadge, "self-start")}>
                  <Text className={documentsClasses.verseBadgeText}>{shloka.verse_label}</Text>
                </Box>
              ) : (
                <Box />
              )}
              {vedaCite ? <Text className={documentsClasses.verseCite}>{vedaCite}</Text> : null}
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
          <Box className={documentsClasses.verseProgress} nativeClassName={isActive ? undefined : "opacity-0"}>
            <Box className={documentsClasses.verseProgressFill} widthPercent={card.progressPct} />
          </Box>
          {meaning ? (
            <Box className={documentsClasses.verseMeaningWrap}>
              <Pressable onPress={onToggleMeaning} className={cn(documentsClasses.verseMeaningToggle, "self-start")} nativeClassName="flex-row items-center">
                <Text className={documentsClasses.verseMeaningToggleText}>{card.copy.meaning}</Text>
                <Icon node={meaningOpen ? iconChevronUp : iconChevronDown} size={16} tone="secondary" />
              </Pressable>
              {meaningOpen ? <Text className={documentsClasses.verseMeaning}>{meaning}</Text> : null}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

function Dock({ children, bottom }: { children: React.ReactNode; bottom: number }) {
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, bottom, alignItems: "center" }}>
      {children}
    </View>
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
  const bottom = props.dockBottom ?? 16;
  if (bar.face === "hidden") return null;
  if (bar.face === "idle") {
    return (
      <Dock bottom={bottom}>
        <Pressable onPress={bar.idle.startsFull ? props.onStartFull : () => props.onPlayThrough?.()} className={cn(documentsClasses.barShell, documentsClasses.barPadIdle, documentsClasses.barRow)}>
          <Box className={documentsClasses.barPlay}>
            <Icon node={iconPlay} size={20} tone="foreground" filled />
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
      <Dock bottom={bottom}>
        <Box className={cn(documentsClasses.barShell, documentsClasses.barPad, documentsClasses.barRow)}>
          <Pressable onPress={props.onToggleFull} label={bar.full.toggleLabel} className={documentsClasses.barPlay}>
            <Icon node={bar.full.playing ? iconPause : iconPlay} size={20} tone="foreground" filled />
          </Pressable>
          <Box className={documentsClasses.fill}>
            <Text className={documentsClasses.barKicker} numberOfLines={1}>{copy.playFull}</Text>
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
        </Box>
      </Dock>
    );
  }
  if (!props.activeShloka) return null;
  return (
    <Dock bottom={bottom}>
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
            <Icon node={bar.verse.playing ? iconPause : iconPlay} size={20} tone="foreground" filled />
          </Pressable>
          <Pressable onPress={props.onNext} disabled={!props.hasNext} label={copy.nextVerse} className={cn(documentsClasses.barSkip, !props.hasNext && "opacity-30")}>
            <Icon node={iconSkipForward} size={16} tone="muted" filled />
          </Pressable>
          <Box className={documentsClasses.fill}>
            <Text className={documentsClasses.barKicker} numberOfLines={1}>{props.documentTitle}</Text>
            <Text className={documentsClasses.barTitle} numberOfLines={1}>{bar.verse.title}</Text>
          </Box>
          {bar.verse.canSwitchToFull ? (
            <Pressable onPress={props.onSwitchToFull} label={copy.switchToFull} className={documentsClasses.barSkip}>
              <Icon node={iconListMusic} size={16} tone="muted" />
            </Pressable>
          ) : null}
        </Box>
      </Box>
    </Dock>
  );
}
