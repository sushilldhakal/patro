import { seoClasses } from "@vedic-patro/design-tokens/classes/seo-classes";
import type { SeoContentRoute } from "@vedic-patro/features/common";
import { SeoContentSection as SeoContentSectionView } from "@vedic-patro/ui/kit/shell";

/** App binding for the shared section. Screens still import this path. */
export function SeoContentSection({ route, className }: { route: SeoContentRoute; className?: string }) {
  return <SeoContentSectionView route={route} className={className ?? seoClasses.section} />;
}
