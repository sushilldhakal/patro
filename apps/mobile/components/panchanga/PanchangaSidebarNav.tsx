import { usePathname, useRouter } from "expo-router";
import { KundaliSidebarSubnav } from "@/components/kundali/KundaliSidebarSubnav";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { parseKundaliProfileId } from "@vedic-patro/domain/jyotish/kundali/kundali-routes";
import { usePanchangaSidebarNav, type PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { elementHref } from "@/lib/element-routes";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { PanchangaSidebarNav as SidebarNav } from "@vedic-patro/ui/kit/panchanga";

export type KundaliSectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
};

function sidebarHref(item: PanchangaSidebarItem): string {
  if (item.to === "/panchanga/element/$name" && item.params?.name) return elementHref(item.params.name);
  if (item.to === "/sait/$category" && item.params?.category) {
    return item.params.category === "vivah" ? "/vivah-sait" : `/sait/${item.params.category}`;
  }
  return item.to;
}

function isItemActive(pathname: string, item: PanchangaSidebarItem): boolean {
  if (item.id === "kundali") return pathname === "/kundali" || pathname.startsWith("/kundali/");
  if (item.id === "kundali-milan") return pathname === "/kundali-milan" || pathname === "/jyotish/kundali-milan";
  const href = sidebarHref(item);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Binds the shared sidebar drawing to Expo Router. */
export function PanchangaSidebarNav({
  className,
  compact,
  kundaliSectionNav,
}: {
  className?: string;
  compact?: boolean;
  kundaliSectionNav?: KundaliSectionNavProps;
}) {
  const router = useRouter();
  const pathname = normalizeMobilePathname(usePathname());
  const kundaliProfileId = parseKundaliProfileId(pathname);
  const nav = usePanchangaSidebarNav({
    pathname,
    isActive: (item) => isItemActive(pathname, item),
    withReminders: true,
  });

  return (
    <SidebarNav
      className={className}
      compact={compact}
      title={nav.navTitle}
      label={nav.navAria}
      sections={nav.sections.map((section) => ({
        id: section.id,
        title: section.title,
        expanded: section.expanded,
        hasActive: section.hasActive,
        onToggle: section.toggle,
        items: section.items.map(({ item, label, blurb, active }) => ({
          id: item.id,
          label,
          blurb,
          active,
          onPress: () => router.push(sidebarHref(item) as never),
          trailing:
            item.id === "kundali" && kundaliProfileId != null && kundaliSectionNav != null ? (
              <KundaliSidebarSubnav activeSectionId={kundaliSectionNav.activeId} onNavigate={kundaliSectionNav.onNavigate} />
            ) : null,
        })),
      }))}
    />
  );
}
