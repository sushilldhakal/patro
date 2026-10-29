import { Pressable, ScrollView, TextInput } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { Box, Button, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { useDocumentJumpForm } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentJumpFormProps } from "../contract";

export function DocumentJumpForm({
  chapterNumbers,
  currentChapter,
  documents,
  currentSlug,
  onJump,
  onSelectDocument,
}: DocumentJumpFormProps) {
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const placeholder = roles.mutedForeground;
  const form = useDocumentJumpForm({
    chapterNumbers,
    currentChapter,
    documents,
    currentSlug,
    onJump,
    onSelectDocument,
  });
  const { copy } = form;

  return (
    <Box className="gap-2">
      {form.hasDocuments ? (
        <Box className={documentsClasses.jumpField}>
          <Text className={documentsClasses.jumpLabel}>{copy.documentLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-1.5">
            {form.documents.map((doc) => {
              const active = doc.slug === form.currentSlug;
              return (
                <Pressable
                  key={doc.slug}
                  onPress={() => form.selectDocument(doc.slug)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={cn("rounded-lg border px-3 py-2", active ? "border-secondary bg-secondary/10" : "border-border bg-card")}
                >
                  <Text className={cn("text-sm font-semibold", active ? "text-secondary" : "text-foreground")} numberOfLines={1}>
                    {doc.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Box>
      ) : null}

      <Box className={documentsClasses.jumpForm}>
        {form.showChapterField ? (
          <Box className={documentsClasses.jumpField}>
            <Text className={documentsClasses.jumpLabel}>{copy.chapterLabel}</Text>
            <TextInput
              value={form.chapterInput}
              onChangeText={form.setChapterInput}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={form.submit}
              accessibilityLabel={copy.chapterLabel}
              placeholderTextColor={placeholder}
              className={cn(documentsClasses.jumpInput, documentsClasses.jumpChapterInput)}
            />
          </Box>
        ) : null}
        <Box className={documentsClasses.jumpField}>
          <Text className={documentsClasses.jumpLabel}>{copy.verseLabel}</Text>
          <TextInput
            value={form.verseInput}
            onChangeText={form.setVerseInput}
            placeholder={copy.versePlaceholder}
            placeholderTextColor={placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={form.submit}
            accessibilityLabel={copy.verseLabel}
            className={cn(documentsClasses.jumpInput, documentsClasses.jumpVerseInput)}
          />
        </Box>
        <Button
          size="sm"
          variant="secondary"
          label={copy.button}
          onPress={form.submit}
          className="gap-1.5"
          icon={
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={8} stroke={roles.secondaryForeground} strokeWidth={2} />
              <Path d="m21 21-4.3-4.3" stroke={roles.secondaryForeground} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          }
        />
      </Box>
      {form.notFound ? (
        <Text className={documentsClasses.jumpError} nativeClassName="mt-2">
          {copy.notFound}
        </Text>
      ) : null}
    </Box>
  );
}
