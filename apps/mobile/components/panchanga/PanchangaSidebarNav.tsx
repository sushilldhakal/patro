import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { KundaliSidebarSubnav } from "@/components/kundali/KundaliSidebarSubnav";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { parseKundaliProfileId } from "@vedic-patro/domain/kundali/kundali-routes";
import { usePanchangaSidebarNav, type PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { elementHref } from "@/lib/element-routes";
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

/** The app route for a sidebar item (element tables and vivah have their own screens). */
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

type SidebarSectionData = ReturnType<typeof usePanchangaSidebarNav>["sections"][number];

function SidebarLink({
  label,
  blurb,
  active,
  onPress,
}: {
  label: string;
  blurb?: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
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
        {label}
      </Text>
      {blurb ? (
        <Text className={panchangaPageClasses.sidebar.linkBlurb} style={nepaliTextStyle(11)}>
          {blurb}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SidebarSection({
  section,
  kundaliProfileId,
  kundaliSectionNav,
}: {
  section: SidebarSectionData;
  kundaliProfileId: string | null;
  kundaliSectionNav?: KundaliSectionNavProps;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const { expanded, hasActive } = section;

  return (
    <View className={cn("pb-1", panchangaPageClasses.sidebar.section)}>
      <Pressable
        onPress={section.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className={cn(
          "flex-row",
          panchangaPageClasses.sidebar.sectionHead,
          hasActive && !expanded && "bg-secondary/5",
        )}
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={hasActive ? colors.secondary : colors.mutedForeground}
        />
        <Text
          className={cn(
            panchangaPageClasses.sidebar.sectionTitle,
            hasActive ? panchangaPageClasses.sidebar.sectionTitleActive : panchangaPageClasses.sidebar.sectionTitleIdle,
          )}
          style={nepaliTextStyle(14)}
        >
          {section.title}
        </Text>
      </Pressable>

      {section.items.length > 0 ? (
        <View className={panchangaPageClasses.sidebar.list}>
          {section.items.map(({ item, label, blurb, active }) => (
            <View key={item.id} className={panchangaPageClasses.sidebar.item}>
              <SidebarLink
                label={label}
                blurb={blurb}
                active={active}
                onPress={() => router.push(sidebarHref(item) as never)}
              />
              {item.id === "kundali" && kundaliProfileId != null && kundaliSectionNav != null ? (
                <KundaliSidebarSubnav
                  activeSectionId={kundaliSectionNav.activeId}
                  onNavigate={kundaliSectionNav.onNavigate}
                />
              ) : null}
            </View>
          ))}
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
  const pathname = normalizeMobilePathname(usePathname());
  const kundaliProfileId = parseKundaliProfileId(pathname);
  const nav = usePanchangaSidebarNav({
    pathname,
    isActive: (item) => isItemActive(pathname, item),
    withReminders: true,
  });

  const body = (
    <>
      <Text
        className={panchangaPageClasses.sidebar.navTitle}
        style={nepaliTextStyle(12)}
        accessibilityLabel={nav.navAria}
      >
        {nav.navTitle}
      </Text>
      <View className={compact ? panchangaPageClasses.sidebar.navBody : cn("max-h-[70vh]", panchangaPageClasses.sidebar.navBody)}>
        {nav.sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
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
