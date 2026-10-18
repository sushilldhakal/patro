import { cn } from "@vedic-patro/design-tokens/cn";
import { navMenuClasses as nav } from "@vedic-patro/design-tokens/classes/shell/nav-menu-classes";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { MobileNavMenuProps } from "../contract";

/** Drawer tiles. Each app supplies the icon and where the tile goes. */
export function MobileNavMenu({ label, sections, className }: MobileNavMenuProps) {
  return (
    <Box as="nav" label={label} className={cn(nav.root, className)}>
      {sections.map((section, index) => (
        <Box key={section.id} as="section" className={index === 0 ? nav.sectionFirst : nav.section}>
          <Box className={nav.heading}>
            <Text as="h2" className={nav.title}>
              {section.title}
            </Text>
            <Box className={nav.accent} />
          </Box>
          <Box className={nav.row}>
            {section.items.map((item) => (
              <Pressable
                key={item.key}
                label={item.label}
                onPress={item.onPress}
                className={cn(nav.tile, item.active && "text-secondary")}
                webClassName={nav.tileWeb}
              >
                <Box className={cn(nav.iconWrap, item.active && nav.iconWrapActive)}>{item.icon}</Box>
                <Text numberOfLines={2} className={cn(nav.label, item.active && nav.labelActive)}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
