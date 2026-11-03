import { cn } from "@vedic-patro/design-tokens/cn";
import { navMenuClasses as nav } from "@vedic-patro/design-tokens/classes/shell/nav-menu-classes";
import { Box, Grid, Pressable, Text } from "@vedic-patro/ui";
import type { MobileNavMenuProps } from "../contract";

/** Drawer tiles. Each app supplies the icon and where the tile goes. */
export function MobileNavMenu({ label, sections, className }: MobileNavMenuProps) {
  return (
    <Box as="nav" label={label} className={cn(nav.root, className)}>
      {sections.map((section, index) => (
        <Box key={section.id} as="section" className={index === 0 ? nav.sectionFirst : nav.section}>
          {section.title ? (
            <Box className={nav.heading}>
              <Text as="h2" className={nav.title}>
                {section.title}
              </Text>
              <Box className={nav.accent} />
            </Box>
          ) : null}
          <Grid cols={{ base: 4 }} gap={6}>
            {section.items.map((item) => (
              <Pressable
                key={item.key}
                label={item.label}
                onPress={item.onPress}
                className={cn(nav.nativeTile, item.active && "text-secondary")}
                webClassName={nav.tileWeb}
              >
                <Box className={cn(nav.nativeIconWrap, item.active && nav.iconWrapActive)}>{item.icon}</Box>
                <Text numberOfLines={2} className={cn(nav.nativeLabel, item.active && nav.labelActive)}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
