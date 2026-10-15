import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { HomeQuickLinksProps } from "../contract";

/** Shortcut groups under the calendar. Each app supplies the icon and where the tile goes. */
export function HomeQuickLinks({ groups, className }: HomeQuickLinksProps) {
  return (
    <Box className={cn(home.quickGroups, className)}>
      {groups.map((group) => (
        <Box key={group.id} as="section">
          <Text as="h2" className={cn(home.quickTitle, home.quickTitlePhone, "md:text-center md:text-sm md:uppercase md:tracking-wider md:text-muted-foreground")}>
            {group.title}
          </Text>
          <Box className={cn(home.quickRow, "gap-2 md:justify-center md:gap-3")}>
            {group.items.map((item) => (
              <Pressable
                key={item.key}
                label={item.label}
                onPress={item.onPress}
                className={cn(home.quickChip, home.quickLinkCard)}
                webClassName="no-underline transition-[border-color,background-color,transform] duration-200 hover:border-secondary/35 hover:bg-tab-hover active:scale-[0.98]"
              >
                <Box className={home.quickLinkIconWrap}>{item.icon}</Box>
                <Text className={cn(home.quickLabel, "min-w-0 px-0.5")} numberOfLines={2}>
                  {item.label}
                </Text>
                {item.description ? <Text className={home.quickLinkDesc}>{item.description}</Text> : null}
              </Pressable>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
