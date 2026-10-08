import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { KundaliSectionNav } from "@/components/kundali/KundaliSectionNav";
import { PanchangaSplitShell, useShowPanchangaSidebar } from "@/components/panchanga/PanchangaSplitShell";
import type { KundaliSectionId } from "@/lib/kundali/kundali-section-nav";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

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

/** Kundali pages — panchanga sidebar rail at ≥992px (web parity). */
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
    <View className="gap-4">
      {!showSidebar && isDetail && sectionNav ? (
        <KundaliSectionNav
          variant="horizontal"
          activeId={sectionNav.activeId}
          onNavigate={sectionNav.onNavigate}
        />
      ) : null}

      {!isDetail && title ? (
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            {eyebrow ? (
              <Text
                className="mb-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={[nepaliTextStyle(12), { paddingTop: 2 }]}
              >
                {eyebrow}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-2.5">
              {icon}
              <Text
                className="shrink text-xl font-bold text-foreground"
                style={[nepaliTextStyle(20), { paddingTop: 2, paddingBottom: 2 }]}
              >
                {title}
              </Text>
            </View>
            {subtitle ? (
              <Text
                className="mt-1 text-sm text-muted-foreground"
                style={[nepaliTextStyle(14), { paddingTop: 1 }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}

      {children}
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
