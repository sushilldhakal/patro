import type { DocumentCategoryId } from "@vedic-patro/domain/document-categories";
import type { DocumentSummary } from "@/lib/documents-api";

export function documentsInGroup(documents: DocumentSummary[], groupId: DocumentCategoryId) {
  return documents.filter((doc) => doc.category === groupId);
}
