import { memo, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import type { Shloka } from "@/lib/documents/api";
import { useLocale, useTranslation } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation();
  const { lang, pick } = useLocale();
  const colors = useThemeColors();
  const canPlay = Boolean(shloka.audio_url) || playsFromFull;
  const meaning = (lang === "ne" ? shloka.meaning_ne || shloka.meaning_en : shloka.meaning_en || shloka.meaning_ne) ?? "";
  const isClosing = shloka.verse_label.startsWith("इति") || shloka.verse_label === "ध्यानम्";
  // Procedure text (टीका / सामग्री) is instructions, not a mantra.
  const isNote = /^(टीका|सामग्री)/.test(shloka.verse_label);

  const tokens = useMemo(() => shloka.sanskrit.split(/(\s+)/), [shloka.sanskrit]);
  const wordIdx = useMemo(
    () => tokens.map((tok, i) => (tok.trim() ? i : -1)).filter((i) => i >= 0),
    [tokens],
  );
  // Estimated word highlight, weighted by character count (no forced alignment).
  const wordStarts = useMemo(() => {
    const lengths = wordIdx.map((i) => tokens[i]!.length);
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lengths.map((len) => {
      const start = acc / total;
      acc += len;
      return start;
    });
  }, [tokens, wordIdx]);
  const activeWord =
    isPlaying && !isNote
      ? wordStarts.reduce((best, start, i) => (start <= progress ? i : best), -1)
      : -1;
  const activeToken = activeWord >= 0 ? wordIdx[activeWord]! : -1;

  return (
    <View
      className={cn(
        "mb-3 rounded-xl border p-4",
        isActive ? "border-secondary bg-secondary/10" : "border-border bg-card",
        isClosing && !isActive && "border-secondary/40",
        isNote && !isActive && "border-dashed",
      )}
    >
      <View className="flex-row items-start gap-3">
        {canPlay ? (
          <Pressable
            onPress={() => onPlay(shloka)}
            accessibilityRole="button"
            accessibilityLabel={t(isPlaying ? "documents.pause_verse" : "documents.play_verse")}
            hitSlop={6}
            className={cn(
              "mt-0.5 h-10 w-10 items-center justify-center rounded-full border",
              isActive ? "border-secondary bg-secondary" : "border-border",
            )}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color={isActive ? inkOn(colors.secondary) : colors.secondary}
              style={isPlaying ? undefined : { marginLeft: 2 }}
            />
          </Pressable>
        ) : (
          <View className="mt-0.5 h-10 w-10 items-center justify-center">
            <Text className="text-xs font-semibold text-muted-foreground">{shloka.verse_label}</Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          {canPlay ? (
            <View className="self-start rounded-md bg-muted px-1.5 py-0.5">
              <Text className="text-xs font-semibold text-muted-foreground">{shloka.verse_label}</Text>
            </View>
          ) : null}
          <RNText
            selectable
            style={[
              nepaliTextStyle(isNote ? 17 : 20),
              { color: colors.foreground, marginTop: 4 },
            ]}
          >
            {tokens.map((tok, i) =>
              i === activeToken ? (
                <RNText key={i} style={{ backgroundColor: "rgba(250,204,21,0.45)" }}>
                  {tok}
                </RNText>
              ) : (
                tok
              ),
            )}
          </RNText>
          {lang !== "ne" && shloka.transliteration ? (
            <Text className="mt-1.5 text-sm italic text-muted-foreground">{shloka.transliteration}</Text>
          ) : null}

          {isActive ? (
            <View className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-border">
              <View
                className="h-full bg-secondary"
                style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
              />
            </View>
          ) : null}

          {meaning ? (
            <View className="mt-1">
              <Pressable
                onPress={() => onToggleMeaning(shloka.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: meaningOpen }}
                className="flex-row items-center gap-1 self-start py-2"
              >
                <Text className="text-xs font-semibold text-secondary">{t("documents.meaning")}</Text>
                <Ionicons name={meaningOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.secondary} />
              </Pressable>
              {meaningOpen ? (
                <RNText
                  selectable
                  style={
                    lang === "ne"
                      ? [nepaliTextStyle(16), { color: colors.foreground }]
                      : { color: colors.foreground, fontSize: 16, lineHeight: 24 }
                  }
                >
                  {meaning}
                </RNText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const ShlokaCard = memo(ShlokaCardImpl);
