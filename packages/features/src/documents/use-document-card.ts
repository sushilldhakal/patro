/**
 * A library card for one document, shared by the website's and the app's
 * `components/documents/DocumentCard.tsx`: title, subtitle and description
 * in the reader's language, and the chapter and verse counts.
 */
import type { DocumentSummary } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export function useDocumentCard(doc: DocumentSummary) {
  const { t, lang, digits } = useLocale();
  return {
    title: bilingualText(lang, doc.title_ne, doc.title_en),
    subtitle: bilingualText(lang, doc.subtitle_ne, doc.subtitle_en, ""),
    description: bilingualText(lang, doc.description_ne, doc.description_en, ""),
    /** "N chapters" (only for documents split into chapters), then "N verses". */
    meta: [
      ...(doc.has_chapters ? [t("documents.chapters_count", { count: digits(doc.chapter_count) })] : []),
      t("documents.shlokas_count", { count: digits(doc.shloka_count) }),
    ],
  };
}
