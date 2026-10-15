/**
 * App wiring for the shared article renderer: in-app navigation and the
 * app's diagram registry. The markup lives in `@vedic-patro/ui/kit/learn`.
 */
import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { ArticleBody as SharedArticleBody, type ArticleBodyProps } from "@vedic-patro/ui/kit/learn";
import { LEARN_DIAGRAMS } from "@/lib/learn/learn-diagrams";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";

function renderDiagram(id: string): ReactNode {
  const Diagram = LEARN_DIAGRAMS[id];
  return Diagram ? <Diagram /> : null;
}

export function ArticleBody({
  article,
  sectionOffset,
  hideSeeAlso,
}: Omit<ArticleBodyProps, "openArticle" | "renderDiagram">) {
  const router = useRouter();
  return (
    <SharedArticleBody
      article={article}
      sectionOffset={sectionOffset}
      hideSeeAlso={hideSeeAlso}
      openArticle={(slug) => {
        router.push(hrefForLearnSlug(slug));
      }}
      renderDiagram={renderDiagram}
    />
  );
}
