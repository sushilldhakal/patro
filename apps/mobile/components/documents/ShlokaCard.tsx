import { memo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { Shloka } from "@/lib/documents/api";
import { useShlokaCard } from "@vedic-patro/features/documents";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

import { illustration, space, withAlpha } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
interface Props {
  shloka: Shloka;
  isActive: boolean;
  /** Whether sound is actually coming from this verse right now. */
  isPlaying: boolean;
  /** 0..1 position inside the sounding verse. */
  progress: number;
  meaningOpen: boolean;
  /** The document has a full recording that carries this verse's timestamp. */
  playsFromFull: boolean;
  onPlay: (shloka: Shloka) => void;
  onToggleMeaning: (id: number) => void;
}

/** One verse: Sanskrit (+ transliteration in English UI), play toggle, meaning. */
function ShlokaCardImpl({
  shloka,
  isActive,
  isPlaying,
  progress,
  meaningOpen,
  playsFromFull,
  onPlay,
  onToggleMeaning,
}: Props) {
  const colors = useThemeColors();
  const card = useShlokaCard({ shloka, isActive, isPlaying, playsFromFull, progress });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;

  return (
    <View
      className={cn(
        documentsClasses.verse,
        "mb-3",
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <View className={documentsClasses.verseRow}>
        {canPlay ? (
          <Pressable
            onPress={() => onPlay(shloka)}
            accessibilityRole="button"
            accessibilityLabel={card.copy.play}
            hitSlop={6}
            className={cn(
              documentsClasses.versePlay,
              isActive ? documentsClasses.versePlayActive : documentsClasses.versePlayIdle,
            )}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={16}
              color={isActive ? inkOn(colors.secondary) : colors.secondary}
              style={isPlaying ? undefined : { marginLeft: space.hair }}
            />
          </Pressable>
        ) : (
          <View className={documentsClasses.verseLabelSlot}>
            <Text className={documentsClasses.verseLabelSlotText}>{shloka.verse_label}</Text>
          </View>
        )}

        <View className={documentsClasses.verseBody}>
          {canPlay || vedaCite ? (
            <View className={documentsClasses.verseMetaRow}>
              {canPlay ? (
                <View className={cn(documentsClasses.verseBadge, "self-start")}>
                  <Text className={documentsClasses.verseBadgeText}>{shloka.verse_label}</Text>
                </View>
              ) : (
                <View />
              )}
              {vedaCite ? (
                <Text className={documentsClasses.verseCite}>{vedaCite}</Text>
              ) : null}
            </View>
          ) : null}
          <Text
            selectable
            className={cn(isNote ? documentsClasses.verseTextNote : documentsClasses.verseText, "text-foreground")}
            style={nepaliTextStyle()}
          >
            {card.tokens.map((tok, i) =>
              i === card.activeTokenIndex ? (
                <Text
                  key={i}
                  className={cn(isNote ? documentsClasses.verseTextNote : documentsClasses.verseText, "mt-0 text-foreground")}
                  style={[nepaliTextStyle(), { backgroundColor: withAlpha(illustration.amber53, 0.45) }]}
                >
                  {tok}
                </Text>
              ) : (
                tok
              ),
            )}
          </Text>
          {card.transliteration ? (
            <Text className={documentsClasses.verseTranslit}>{card.transliteration}</Text>
          ) : null}

          {/* Always mounted: mounting it on play would grow the card and shift the list. */}
          <View className={documentsClasses.verseProgress} style={{ opacity: isActive ? 1 : 0 }}>
            <View
              className={documentsClasses.verseProgressFill}
              style={{ width: `${card.progressPct}%` }}
            />
          </View>

          {meaning ? (
            <View className={documentsClasses.verseMeaningWrap}>
              <Pressable
                onPress={() => onToggleMeaning(shloka.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: meaningOpen }}
                className={cn(documentsClasses.verseMeaningToggle, "flex-row items-center self-start")}
              >
                <Text className={documentsClasses.verseMeaningToggleText}>{card.copy.meaning}</Text>
                <Ionicons name={meaningOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.secondary} />
              </Pressable>
              {meaningOpen ? (
                <Text selectable className={documentsClasses.verseMeaning} style={card.meaningIsNepali ? nepaliTextStyle() : undefined}>
                  {meaning}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const ShlokaCard = memo(ShlokaCardImpl);
