import type { FormEvent } from "react";
import { Button, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useDocumentJumpForm } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentJumpFormProps } from "../contract";
import { iconSearch } from "../icons";

const inputWeb =
  "bg-transparent transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentJumpForm({ chapterNumbers, currentChapter, onJump }: DocumentJumpFormProps) {
  const form = useDocumentJumpForm({ chapterNumbers, currentChapter, onJump: onJump ?? (() => false) });
  const { copy } = form;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <form onSubmit={handleSubmit} className={documentsClasses.jumpForm}>
      {form.showChapter ? (
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
      <label className={documentsClasses.jumpField}>
        <Text as="span" className={documentsClasses.jumpLabel}>
          {copy.verseLabel}
        </Text>
        <input
          value={form.verseInput}
          onChange={(e) => form.setVerseInput(e.target.value)}
          placeholder={copy.versePlaceholder}
          aria-label={copy.verseLabel}
          className={cn(documentsClasses.jumpInput, documentsClasses.jumpVerseInput, inputWeb)}
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" label={copy.button} className="gap-1.5" icon={<Icon node={iconSearch} size="sm" tone="foreground" className="text-secondary-foreground" />} />
      {form.notFound ? (
        <Text as="p" className={documentsClasses.jumpError} webClassName="basis-full">
          {copy.notFound}
        </Text>
      ) : null}
    </form>
  );
}
