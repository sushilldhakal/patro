import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { KundaliSidebarSubnav } from "@/components/kundali/KundaliSidebarSubnav";
import type { KundaliSectionId } from "@/lib/kundali/kundali-section-nav";
import { parseKundaliProfileId } from "@/lib/kundali/kundali-routes";
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
import { cn } from "@/lib/utils";
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
      className={cn("rounded-xl px-3 py-2", !active && "active:bg-muted")}
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
        className={cn("text-body", active ? "font-semibold text-secondary" : "font-medium text-foreground")}
        style={nepaliTextStyle(14)}
      >
        {pick(item.labelNe, item.labelEn)}
      </Text>
      {item.blurbNe ? (
        <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(11)}>
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
      <View key={item.id} className="gap-0.5">
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
    <View className="border-b border-border/60 pb-1 last:border-b-0">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
        style={
          hasActiveItem && !expanded
            ? { backgroundColor: colorWithAlpha(colors.secondary, 0.06) }
            : undefined
        }
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={hasActiveItem ? colors.secondary : colors.mutedForeground}
        />
        <Text
          className={cn(
            "text-body min-w-0 flex-1 font-bold uppercase tracking-wide",
            hasActiveItem ? "text-secondary" : "text-muted-foreground",
          )}
          style={nepaliTextStyle(14)}
        >
          {pick(section.titleNe, section.titleEn)}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="gap-0.5 px-1 pb-2">{section.items.map((item) => renderItem(item))}</View>
      ) : hasActiveItem ? (
        <View className="gap-0.5 px-1 pb-2">
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
        className="text-caption border-b border-border px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground"
        style={nepaliTextStyle(12)}
      >
        {pick("पञ्चाङ्ग", "Panchanga")}
      </Text>
      <View className={compact ? "p-1" : "max-h-[70vh] p-1"}>
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
      <View className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
        {body}
      </View>
    );
  }

  return (
    <View className={cn("w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
    </View>
  );
}
