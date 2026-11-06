import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { Box, Button, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { useDocumentJumpForm } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentJumpFormProps } from "../contract";

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DocumentJumpForm({
  chapterNumbers,
  chapterPrefixes,
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
    chapterPrefixes,
    currentChapter,
    documents,
    currentSlug,
    onJump,
    onSelectDocument,
  });
  const { copy } = form;
  const [open, setOpen] = useState(false);
  const current = form.documents.find((doc) => doc.slug === form.currentSlug);

  return (
    <Box className="gap-1">
      <Box className={documentsClasses.jumpForm}>
        {form.hasDocuments ? (
          <Box className={cn(documentsClasses.jumpField, documentsClasses.jumpSectionField)}>
            <Text className={documentsClasses.jumpLabel}>{copy.documentLabel}</Text>
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={copy.documentLabel}
              className={documentsClasses.jumpSelectTrigger}
            >
              <Text className={documentsClasses.jumpSelectLabel} numberOfLines={1}>
                {current?.title ?? copy.documentLabel}
              </Text>
              <Chevron color={roles.mutedForeground} />
            </Pressable>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
              <Box className={documentsClasses.jumpMenuHost}>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.documentLabel} onPress={() => setOpen(false)} className={documentsClasses.jumpMenuBackdrop} />
                <Box className={documentsClasses.jumpMenuSheet}>
                  <ScrollView className={documentsClasses.jumpMenuList} keyboardShouldPersistTaps="handled">
                    {form.documents.map((doc) => {
                      const active = doc.slug === form.currentSlug;
                      return (
                        <Pressable
                          key={doc.slug}
                          onPress={() => {
                            form.selectDocument(doc.slug);
                            setOpen(false);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          className={cn(documentsClasses.jumpMenuRow, active && documentsClasses.jumpMenuRowOn)}
                        >
                          <Text className={documentsClasses.jumpSelectLabel}>{doc.title}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Box>
              </Box>
            </Modal>
          </Box>
        ) : form.showChapterField ? (
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
