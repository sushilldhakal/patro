import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { KundaliSidebarSubnav } from "@/components/kundali/KundaliSidebarSubnav";
import type { KundaliSectionId } from "@/lib/kundali/kundali-section-nav";
import { parseKundaliProfileId } from "@vedic-patro/domain/kundali/kundali-routes";
import {
  findActivePanchangaSidebarSection,
  isPanchangaSidebarItemActive,
  PANCHANGA_SIDEBAR_SECTIONS,
  type PanchangaSidebarItem,
  type PanchangaSidebarSection,
} from "@/lib/panchanga/panchanga-sidebar-nav";
import { useLocale } from "@/lib/i18n";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

export type KundaliSectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
};

function SidebarLink({
  item,
  active,
  onPress,
}: {
  item: PanchangaSidebarItem;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  return (
    <Pressable
      onPress={onPress}
      className={cn(panchangaPageClasses.sidebar.link, !active && "active:bg-muted")}
      style={
        active
          ? {
              backgroundColor: colorWithAlpha(colors.secondary, 0.14),
              borderWidth: 1,
              borderColor: colorWithAlpha(colors.secondary, 0.28),
            }
          : undefined
      }
    >
      <Text
        className={cn(panchangaPageClasses.sidebar.linkLabel, active ? panchangaPageClasses.sidebar.linkLabelActive : panchangaPageClasses.sidebar.linkLabelIdle)}
        style={nepaliTextStyle(14)}
      >
        {pick(item.labelNe, item.labelEn)}
      </Text>
      {item.blurbNe ? (
        <Text className={panchangaPageClasses.sidebar.linkBlurb} style={nepaliTextStyle(11)}>
          {pick(item.blurbNe, item.blurbEn ?? item.blurbNe)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SidebarSection({
  section,
  expanded,
  onToggle,
  pathname,
  kundaliProfileId,
  kundaliSectionNav,
}: {
  section: PanchangaSidebarSection;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
  kundaliProfileId: string | null;
  kundaliSectionNav?: KundaliSectionNavProps;
}) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const router = useRouter();
  const hasActiveItem = section.items.some((item) => isPanchangaSidebarItemActive(pathname, item));

  const renderItem = (item: PanchangaSidebarItem, forceActive?: boolean) => {
    const active = forceActive ?? isPanchangaSidebarItemActive(pathname, item);
    const showKundaliSections =
      item.id === "kundali" && kundaliProfileId != null && kundaliSectionNav != null;

    return (
      <View key={item.id} className={panchangaPageClasses.sidebar.item}>
        <SidebarLink
          item={item}
          active={active}
          onPress={() => router.push(item.href as never)}
        />
        {showKundaliSections ? (
          <KundaliSidebarSubnav
            activeSectionId={kundaliSectionNav.activeId}
            onNavigate={kundaliSectionNav.onNavigate}
          />
        ) : null}
      </View>
    );
  };

  return (
    <View className={cn("pb-1", panchangaPageClasses.sidebar.section)}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className={cn(
          "flex-row",
          panchangaPageClasses.sidebar.sectionHead,
          hasActiveItem && !expanded && "bg-secondary/5",
        )}
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={hasActiveItem ? colors.secondary : colors.mutedForeground}
        />
        <Text
          className={cn(
            panchangaPageClasses.sidebar.sectionTitle,
            hasActiveItem ? panchangaPageClasses.sidebar.sectionTitleActive : panchangaPageClasses.sidebar.sectionTitleIdle,
          )}
          style={nepaliTextStyle(14)}
        >
          {pick(section.titleNe, section.titleEn)}
        </Text>
      </Pressable>

      {expanded ? (
        <View className={panchangaPageClasses.sidebar.list}>{section.items.map((item) => renderItem(item))}</View>
      ) : hasActiveItem ? (
        <View className={panchangaPageClasses.sidebar.list}>
          {section.items.filter((item) => isPanchangaSidebarItemActive(pathname, item)).map((item) => renderItem(item, true))}
        </View>
      ) : null}
    </View>
  );
}

export function PanchangaSidebarNav({
  className,
  compact,
  kundaliSectionNav,
}: {
  className?: string;
  compact?: boolean;
  /** When on `/kundali/:profileId`, nested section tabs under birth-chart link. */
  kundaliSectionNav?: KundaliSectionNavProps;
}) {
  const { pick } = useLocale();
  const pathname = normalizeMobilePathname(usePathname());
  const kundaliProfileId = parseKundaliProfileId(pathname);
  const activeSectionId = findActivePanchangaSidebarSection(pathname);
  const [expandedId, setExpandedId] = useState<string | null>(activeSectionId);

  useEffect(() => {
    if (activeSectionId) setExpandedId(activeSectionId);
  }, [activeSectionId]);

  const body = (
    <>
      <Text
        className={panchangaPageClasses.sidebar.navTitle}
        style={nepaliTextStyle(12)}
      >
        {pick("पञ्चाङ्ग", "Panchanga")}
      </Text>
      <View className={compact ? panchangaPageClasses.sidebar.navBody : cn("max-h-[70vh]", panchangaPageClasses.sidebar.navBody)}>
        {PANCHANGA_SIDEBAR_SECTIONS.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            expanded={expandedId === section.id}
            onToggle={() => setExpandedId((current) => (current === section.id ? null : section.id))}
            pathname={pathname}
            kundaliProfileId={kundaliProfileId}
            kundaliSectionNav={kundaliSectionNav}
          />
        ))}
      </View>
    </>
  );

  if (compact) {
    return (
      <View className={cn("overflow-hidden", panchangaPageClasses.sidebar.nav, className)}>
        {body}
      </View>
    );
  }

  return (
    <View className={cn("w-full shrink-0 overflow-hidden", panchangaPageClasses.sidebar.nav, className)}>
      <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
    </View>
  );
}
