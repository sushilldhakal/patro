import type { MouseEvent, ReactNode } from "react";
import { Text } from "@vedic-patro/ui";
import type { InlinePart } from "@vedic-patro/domain/learn/article-model";
import { parseInlineMarkup } from "@vedic-patro/domain/learn/article-model";
import {
  tmInkAmber,
  tmInkNum,
  tmInkStrong,
  tmInkTeal,
} from "@vedic-patro/design-tokens/classes/learn-classes";

const MARK = {
  strong: tmInkStrong,
  teal: tmInkTeal,
  amber: tmInkAmber,
  num: tmInkNum,
} as const;

function openFromAnchor(event: MouseEvent<HTMLAnchorElement>, slug: string, openArticle: (slug: string) => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  openArticle(slug);
}

export function drawInline(parts: InlinePart[], openArticle: (slug: string) => void): ReactNode {
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0].kind === "text") return parts[0].text;
  const nodes = parts.map((part, index) => {
    if (part.kind === "text") return part.text;
    if (part.kind === "link") {
      return (
        <a
          key={index}
          href={`/learn/${part.slug}`}
          className={tmInkTeal}
          onClick={(event) => openFromAnchor(event, part.slug, openArticle)}
        >
          {part.label}
        </a>
      );
    }
    return (
      <Text key={index} as="span" className={MARK[part.kind]}>
        {part.text}
      </Text>
    );
  });
  return <>{nodes}</>;
}

export function InlineText({ text, openArticle }: { text: string; openArticle: (slug: string) => void }) {
  return drawInline(parseInlineMarkup(text), openArticle);
}
