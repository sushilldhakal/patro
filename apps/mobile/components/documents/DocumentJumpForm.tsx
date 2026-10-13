import { useState } from "react";
import { TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

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

  return (
    <View>
      <View className={documentsClasses.jumpForm}>
        {currentChapter == null ? (
          <View className={documentsClasses.jumpField}>
            <Text className={documentsClasses.jumpLabel}>{t("documents.jump_chapter_label")}</Text>
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
              className={cn(documentsClasses.jumpInput, documentsClasses.jumpChapterInput)}
            />
          </View>
        ) : null}
        <View className={documentsClasses.jumpField}>
          <Text className={documentsClasses.jumpLabel}>{t("documents.jump_verse_label")}</Text>
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
            className={cn(documentsClasses.jumpInput, documentsClasses.jumpVerseInput)}
          />
        </View>
        <Button
          size="sm"
          variant="secondary"
          label={t("documents.jump_button")}
          onPress={submit}
          className="gap-1.5"
          icon={<Ionicons name="search" size={14} color={inkOn(colors.secondary)} />}
        />
      </View>
      {notFound ? <Text className={cn("mt-2", documentsClasses.jumpError)}>{t("documents.jump_not_found")}</Text> : null}
    </View>
  );
}
