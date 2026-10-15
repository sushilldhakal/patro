import { ScrollView } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { panchangaPageClasses as pg } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { chevronDownIcon, chevronRightIcon } from "../icons";
import type { PanchangaSidebarSectionView } from "../sidebar-types";

export type { PanchangaSidebarItemView, PanchangaSidebarLinkArgs, PanchangaSidebarSectionView } from "../sidebar-types";

const s = pg.sidebar;

export function PanchangaSidebarNav({
  title,
  label,
  sections,
  className,
  compact,
}: {
  title: string;
  label: string;
  sections: PanchangaSidebarSectionView[];
  className?: string;
  compact?: boolean;
}) {
  const body = (
    <>
      <Text className={s.navTitle}>{title}</Text>
      <Box className={compact ? s.navBody : cn("max-h-[70vh]", s.navBody)}>
        {sections.map((section) => (
          <Box key={section.id} className={cn("pb-1", s.section)}>
            <Pressable
              onPress={section.onToggle}
              className={cn("flex-row", s.sectionHead, section.hasActive && !section.expanded && "bg-secondary/5")}
            >
              <Icon node={section.expanded ? chevronDownIcon : chevronRightIcon} size={16} tone={section.hasActive ? "secondary" : "muted"} />
              <Text className={cn(s.sectionTitle, section.hasActive ? s.sectionTitleActive : s.sectionTitleIdle)}>{section.title}</Text>
            </Pressable>
            {section.items.length > 0 ? (
              <Box className={s.list}>
                {section.items.map((item) => (
                  <Box key={item.id} className={s.item}>
                    <Pressable
                      onPress={item.onPress}
                      className={cn(s.link, !item.active && "active:bg-muted")}
                      nativeClassName={item.active ? "border border-secondary/30 bg-secondary/15" : undefined}
                    >
                      <Text className={cn(s.linkLabel, item.active ? s.linkLabelActive : s.linkLabelIdle)}>{item.label}</Text>
                      {item.blurb ? <Text className={s.linkBlurb}>{item.blurb}</Text> : null}
                    </Pressable>
                    {item.trailing}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </>
  );

  if (compact) {
    return <Box className={cn("overflow-hidden", s.nav, className)} label={label}>{body}</Box>;
  }
  return (
    <Box className={cn("w-full shrink-0 overflow-hidden", s.nav, className)} label={label}>
      <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
    </Box>
  );
}
