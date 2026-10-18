import { Linking } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { shellClasses as shell } from "@vedic-patro/design-tokens/classes/shell-classes";
import { useSiteFooter } from "@vedic-patro/features/common";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { SiteFooterProps } from "../contract";

/** Privacy, Terms, Support and the site. In-app paths use `onOpenPage`; mail and the site open externally. */
export function SiteFooter({ onOpenPage, className }: SiteFooterProps) {
  const links = useSiteFooter();
  return (
    <Box className={cn(shell.footer, className)}>
      <Box className={cn("w-full flex-row flex-wrap", shell.footerRow)}>
        {links.map((link) => (
          <Pressable
            key={link.id}
            label={link.label}
            onPress={() => (link.kind === "page" ? onOpenPage(link.path) : void Linking.openURL(link.url))}
          >
            <Text className={shell.footerLink}>{link.label}</Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );
}
