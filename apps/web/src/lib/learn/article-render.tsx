/**
 * Website wiring for the shared article renderer: client navigation and the
 * website's diagram registry. The markup lives in `@vedic-patro/ui/kit/learn`.
 */
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { DiagramId } from "@vedic-patro/domain/learn/diagram-ids";
import { ArticleBody as SharedArticleBody, type ArticleBodyProps } from "@vedic-patro/ui/kit/learn";
import { LEARN_DIAGRAMS } from "./learn-diagrams";

function renderDiagram(id: string): ReactNode {
  const Diagram = LEARN_DIAGRAMS[id as DiagramId];
  return Diagram ? <Diagram /> : null;
}

export function ArticleBody({
  article,
  sectionOffset,
  hideSeeAlso,
}: Omit<ArticleBodyProps, "openArticle" | "renderDiagram">) {
  const navigate = useNavigate();
  return (
    <SharedArticleBody
      article={article}
      sectionOffset={sectionOffset}
      hideSeeAlso={hideSeeAlso}
      openArticle={(slug) => {
        navigate({ to: "/learn/$slug", params: { slug } });
      }}
      renderDiagram={renderDiagram}
    />
  );
}
