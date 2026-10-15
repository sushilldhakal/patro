import { cn } from "@vedic-patro/domain/utils";
import { shellClasses as shell } from "@vedic-patro/design-tokens/classes/shell-classes";
import { useSiteFooter } from "@vedic-patro/features/common";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { SiteFooterProps } from "../contract";

/** Privacy, Terms, Support and the site. Page links go through `onOpenPage` so the website stays a single-page app. */
export function SiteFooter({ onOpenPage, className }: SiteFooterProps) {
  const links = useSiteFooter();
  return (
    <Box as="footer" className={cn(shell.footer, className)}>
      <Box className={cn("flex flex-row flex-wrap", shell.footerRow)}>
        {links.map((link) =>
          link.kind === "page" ? (
            <Pressable key={link.id} label={link.label} onPress={() => onOpenPage(link.path)} webClassName="hover:text-foreground">
              <Text className={shell.footerLink}>{link.label}</Text>
            </Pressable>
          ) : (
            <a key={link.id} href={link.url} className={cn(shell.footerLink, "hover:text-foreground")}>
              {link.label}
            </a>
          ),
        )}
      </Box>
    </Box>
  );
}
