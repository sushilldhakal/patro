import type { DashaTreeNode } from "@vedic-patro/api-client";
import type { DashaLord, DashaSpan } from "@vedic-patro/domain/jyotish/dasha";

/** Span with the pre-computed children the API embedded (down to pratyantar). */
export type SpanWithChildren = DashaSpan & { childNodes?: DashaTreeNode[]; lordNe: string };

export function toSpan(node: DashaTreeNode): SpanWithChildren {
  return {
    lord: (node.lord as DashaLord) ?? "ketu",
    lordNe: node.lord_ne,
    start: new Date(node.start),
    end: new Date(node.end),
    childNodes: node.children,
  };
}
