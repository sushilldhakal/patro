import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

interface Props {
  /** Every valid chapter number, for validating the typed chapter. */
  chapterNumbers: number[];
  /** On a chapter page the chapter field is hidden and fixed to this. */
  currentChapter?: number;
  /** Returns false when the target couldn't be found. */
  onJump: (chapter: number, verse: string) => boolean;
}

/** "Go to chapter & verse" — matches a verse's printed `verse_label` exactly. */
export function DocumentJumpForm({ chapterNumbers, currentChapter, onJump }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const [chapterInput, setChapterInput] = useState("");
  const [verseInput, setVerseInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  const submit = () => {
    const chapter = currentChapter ?? Number(chapterInput);
    if (currentChapter == null && !chapterNumbers.includes(chapter)) {
      setNotFound(true);
      return;
    }
    if (currentChapter != null && !verseInput.trim()) return;
    setNotFound(!onJump(chapter, verseInput.trim()));
  };

  const inputStyle = {
    color: colors.foreground,
    borderColor: colors.border,
    backgroundColor: colors.card,
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-end gap-2">
        {currentChapter == null ? (
          <View>
            <Text className="mb-1 text-xs font-semibold text-muted-foreground">{t("documents.jump_chapter_label")}</Text>
            <TextInput
              value={chapterInput}
              onChangeText={(v) => {
                setChapterInput(v);
                setNotFound(false);
              }}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={submit}
              accessibilityLabel={t("documents.jump_chapter_label")}
              className="h-11 w-20 rounded-lg border px-3 text-base"
              style={inputStyle}
            />
          </View>
        ) : null}
        <View>
          <Text className="mb-1 text-xs font-semibold text-muted-foreground">{t("documents.jump_verse_label")}</Text>
          <TextInput
            value={verseInput}
            onChangeText={(v) => {
              setVerseInput(v);
              setNotFound(false);
            }}
            placeholder={t("documents.jump_verse_placeholder")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel={t("documents.jump_verse_label")}
            className="h-11 w-32 rounded-lg border px-3 text-base"
            style={inputStyle}
          />
        </View>
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          className="h-11 flex-row items-center gap-1.5 rounded-lg bg-secondary px-4"
        >
          <Ionicons name="search" size={15} color={inkOn(colors.secondary)} />
          <Text className="text-sm font-semibold text-secondary-foreground">{t("documents.jump_button")}</Text>
        </Pressable>
      </View>
      {notFound ? <Text className="mt-2 text-xs text-destructive">{t("documents.jump_not_found")}</Text> : null}
    </View>
  );
}
