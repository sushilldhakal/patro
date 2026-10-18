import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { PanchangaSplitShell, useShowPanchangaSidebar } from "@/components/panchanga/PanchangaSplitShell";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { Text } from "@/components/ui/Text";
import { Deferred } from "@/components/ui/Deferred";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

type SectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
};

type Props = {
  eyebrow?: string;
  /** Icon beside the title, as web's `<h1>` row. */
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  variant?: "list" | "detail";
  sectionNav?: SectionNavProps;
};

/**
 * Kundali pages — panchanga sidebar rail at ≥992px (web parity). Below that the
 * horizontal section bar is the page's own, placed after the ayanamsha card.
 */
export function KundaliPageShell({
  eyebrow,
  icon,
  title,
  subtitle,
  headerRight,
  children,
  variant = "list",
  sectionNav,
}: Props) {
  const showSidebar = useShowPanchangaSidebar();
  const isDetail = variant === "detail";

  const mainColumn = (
    <View className={isDetail ? "gap-4" : "gap-0"}>
      {!isDetail && title ? (
        <View className={kundaliClasses.headerRow}>
          <View className="min-w-0 flex-1">
            {eyebrow ? (
              <Text
                className={cn(kundaliClasses.eyebrow, "pt-0.5")}
                style={nepaliTextStyle(12)}
              >
                {eyebrow}
              </Text>
            ) : null}
            <View className={kundaliClasses.titleRow}>
              {icon}
              <Text
                className={cn(kundaliClasses.title, "shrink py-0.5")}
                style={nepaliTextStyle(20)}
              >
                {title}
              </Text>
            </View>
            {subtitle ? (
              <Text
                className={cn(kundaliClasses.subtitle, "pt-0.5")}
                style={nepaliTextStyle(14)}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}

      {/* Header first; the chart cards mount right after it has drawn. */}
      <Deferred>{children}</Deferred>
    </View>
  );

  return (
    <PanchangaSplitShell
      mainScroll
      compact
      kundaliSectionNav={isDetail && showSidebar ? sectionNav : undefined}
    >
      {mainColumn}
    </PanchangaSplitShell>
  );
}
