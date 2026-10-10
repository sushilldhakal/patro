import type { ReactNode } from "react";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";

/**
 * `**strong**`, `*teal*`, `~amber~` and `` `numeric` `` → styled spans, and
 * `[[slug|label]]` → an in-app link to another Learn article.
 *
 * Native port of web's `richText()` (`src/lib/learn/article-render.tsx`) — same
 * regex, same marker meanings, RN nested `<Text>` instead of DOM spans.
 *
 * Ordered so `**` is consumed before the single-asterisk rule. Unmatched
 * markers are left as literal text rather than swallowed, which keeps a typo
 * in one article from eating the rest of its paragraph.
 */
const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|~([^~]+)~|`([^`]+)`|\[\[([\w-]+)\|([^\]]+)\]\]/g;

export function richText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));

    const [, strong, teal, amber, num, linkSlug, linkLabel] = match;
    if (strong !== undefined) {
      parts.push(
        <Text key={key++} className="font-semibold text-foreground">
          {strong}
        </Text>,
      );
    } else if (teal !== undefined) {
      parts.push(
        <Text key={key++} className="font-semibold text-secondary">
          {teal}
        </Text>,
      );
    } else if (amber !== undefined) {
      parts.push(
        <Text key={key++} className="font-semibold text-primary">
          {amber}
        </Text>,
      );
    } else if (num !== undefined) {
      parts.push(
        <Text key={key++} className="font-num text-foreground">
          {num}
        </Text>,
      );
    } else if (linkSlug !== undefined) {
      parts.push(
        <Text
          key={key++}
          className="font-semibold text-secondary"
          onPress={() => router.push(`/learn/${linkSlug}` as never)}
        >
          {linkLabel}
        </Text>,
      );
    }
    last = at + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
