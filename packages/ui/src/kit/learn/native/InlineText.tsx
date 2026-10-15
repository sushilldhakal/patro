import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import { Text } from "@vedic-patro/ui";
import type { InlinePart } from "@vedic-patro/domain/learn/article-model";
import { parseInlineMarkup } from "@vedic-patro/domain/learn/article-model";
import { articleClasses as cls } from "@vedic-patro/design-tokens/classes/learn/article-classes";

const MARK = {
  strong: cls.strong,
  teal: cls.teal,
  amber: cls.amber,
  num: cls.num,
} as const;

export function drawInline(parts: InlinePart[], openArticle: (slug: string) => void): ReactNode {
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0].kind === "text") return parts[0].text;
  const nodes = parts.map((part, index) => {
    if (part.kind === "text") return part.text;
    if (part.kind === "link") {
      return (
        <RNText key={index} className={cls.teal} onPress={() => openArticle(part.slug)}>
          {part.label}
        </RNText>
      );
    }
    return (
      <Text key={index} className={MARK[part.kind]}>
        {part.text}
      </Text>
    );
  });
  return <>{nodes}</>;
}

export function InlineText({ text, openArticle }: { text: string; openArticle: (slug: string) => void }) {
  return drawInline(parseInlineMarkup(text), openArticle);
}
