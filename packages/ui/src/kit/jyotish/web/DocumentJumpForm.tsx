import type { FormEvent } from "react";
import { Button, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useDocumentJumpForm } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentJumpFormProps } from "../contract";
import { iconSearch } from "../icons";

const inputWeb =
  "bg-transparent transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentJumpForm({
  chapterNumbers,
  currentChapter,
  documents,
  currentSlug,
  onJump,
  onSelectDocument,
}: DocumentJumpFormProps) {
  const form = useDocumentJumpForm({
    chapterNumbers,
    currentChapter,
    documents,
    currentSlug,
    onJump: onJump ?? (() => false),
    onSelectDocument,
  });
  const { copy } = form;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <form onSubmit={handleSubmit} className={documentsClasses.jumpForm}>
      {form.hasDocuments ? (
        <label className={cn(documentsClasses.jumpField, documentsClasses.jumpSectionField)}>
          <Text as="span" className={documentsClasses.jumpLabel}>
            {copy.documentLabel}
          </Text>
          <select
            value={form.currentSlug}
            onChange={(e) => form.selectDocument(e.target.value)}
            aria-label={copy.documentLabel}
            className={cn(documentsClasses.jumpSectionSelect, inputWeb)}
          >
            {form.documents.map((doc) => (
              <option key={doc.slug} value={doc.slug}>
                {doc.title}
              </option>
            ))}
          </select>
        </label>
      ) : form.showChapterField ? (
        <label className={documentsClasses.jumpField}>
          <Text as="span" className={documentsClasses.jumpLabel}>
            {copy.chapterLabel}
          </Text>
          <input
            inputMode="numeric"
            value={form.chapterInput}
            onChange={(e) => form.setChapterInput(e.target.value)}
            aria-label={copy.chapterLabel}
            className={cn(documentsClasses.jumpInput, documentsClasses.jumpChapterInput, inputWeb)}
          />
        </label>
      ) : null}
      <label className={cn(documentsClasses.jumpField, documentsClasses.jumpVerseField)}>
        <Text as="span" className={documentsClasses.jumpLabel}>
          {copy.verseLabel}
        </Text>
        <input
          value={form.verseInput}
          onChange={(e) => form.setVerseInput(e.target.value)}
          placeholder={copy.versePlaceholder}
          aria-label={copy.verseLabel}
          className={cn(documentsClasses.jumpInput, documentsClasses.jumpVerseInputWeb, inputWeb)}
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" label={copy.button} className="h-10 shrink-0 gap-1.5 sm:h-9" icon={<Icon node={iconSearch} size="sm" tone="foreground" className="text-secondary-foreground" />} />
      {form.notFound ? (
        <Text as="p" className={documentsClasses.jumpError} webClassName="basis-full">
          {copy.notFound}
        </Text>
      ) : null}
    </form>
  );
}
