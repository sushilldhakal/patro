import {
  CalendarRange,
  CircleDot,
  Flame,
  Grid3x3,
  Home,
  Scale,
  ScrollText,
  Sparkles,
  Star,
} from "lucide-react";
import type { KundaliNavIcon, KundaliSectionId } from "@vedic-patro/features/kundali";
import { KundaliSectionNav as Shared } from "@vedic-patro/ui/kit/jyotish";

export {
  BALA_SECTION_IDS,
  BALA_TAB_SECTIONS,
  DASHA_TAB_SECTIONS,
  DEFAULT_KUNDALI_SECTION,
  KUNDALI_NAV_GROUPS,
  KUNDALI_SECTIONS,
  contentSectionId,
  dashaSectionId,
  dashaSystemFromSection,
  defaultChildForGroup,
  isBalaSection,
  navGroupIdForSection,
  parseKundaliSectionFromHash,
  type BalaSectionId,
  type KundaliContentSectionId,
  type KundaliSectionId,
} from "@vedic-patro/features/kundali";

const ICONS: Record<KundaliNavIcon, typeof Sparkles> = {
  overview: Sparkles,
  graha: CircleDot,
  yoga: Star,
  dasha: CalendarRange,
  shadbala: Scale,
  bhava: Home,
  ashtakavarga: Grid3x3,
  vimshopaka: Grid3x3,
  shanti: Flame,
  analysis: ScrollText,
};

/** The address bar is the website's. The section list is shared. */
export function setKundaliSectionHash(id: KundaliSectionId) {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}${window.location.search}#${id}`;
  window.history.replaceState(null, "", url);
}

export function KundaliSectionNav(props: { activeId: KundaliSectionId; onNavigate: (id: KundaliSectionId) => void; className?: string; variant?: "sidebar" | "horizontal" }) {
  return (
    <Shared
      {...props}
      renderIcon={(name) => {
        const Icon = ICONS[name];
        return <Icon className="size-4 shrink-0" aria-hidden />;
      }}
    />
  );
}
