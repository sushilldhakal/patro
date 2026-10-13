import { useDocumentJumpForm } from "@vedic-patro/features/documents";
import { TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
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
  const colors = useThemeColors();
  const form = useDocumentJumpForm({ chapterNumbers, currentChapter, onJump });
  const { copy } = form;

  return (
    <View>
      <View className={documentsClasses.jumpForm}>
        {form.showChapter ? (
          <View className={documentsClasses.jumpField}>
            <Text className={documentsClasses.jumpLabel}>{copy.chapterLabel}</Text>
            <TextInput
              value={form.chapterInput}
              onChangeText={form.setChapterInput}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={form.submit}
              accessibilityLabel={copy.chapterLabel}
              className={cn(documentsClasses.jumpInput, documentsClasses.jumpChapterInput)}
            />
          </View>
        ) : null}
        <View className={documentsClasses.jumpField}>
          <Text className={documentsClasses.jumpLabel}>{copy.verseLabel}</Text>
          <TextInput
            value={form.verseInput}
            onChangeText={form.setVerseInput}
            placeholder={copy.versePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={form.submit}
            accessibilityLabel={copy.verseLabel}
            className={cn(documentsClasses.jumpInput, documentsClasses.jumpVerseInput)}
          />
        </View>
        <Button
          size="sm"
          variant="secondary"
          label={copy.button}
          onPress={form.submit}
          className="gap-1.5"
          icon={<Ionicons name="search" size={14} color={inkOn(colors.secondary)} />}
        />
      </View>
      {form.notFound ? <Text className={cn("mt-2", documentsClasses.jumpError)}>{copy.notFound}</Text> : null}
    </View>
  );
}
