import { cn } from "@vedic-patro/domain/utils";
import { Grid, Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { RelatedPageLinksProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Related-page cards. Each app supplies the icon and where the card goes. */
export function RelatedPageLinks({ heading, label, headingIcon, items, className }: RelatedPageLinksProps) {
  if (!items.length) return null;
  return (
    <Box as="aside" className={cn("mt-10 border-t border-border pt-8", className)} label={label}>
      <Box className="mb-3 flex flex-row items-center gap-2">
        {headingIcon}
        <Text as="h2" className="text-sm font-semibold text-foreground">
          {heading}
        </Text>
      </Box>
      <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={8}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            label={item.label}
            onPress={item.onPress}
            className="flex flex-row items-start gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5"
            webClassName="transition-colors hover:border-secondary/60 hover:bg-secondary/[0.04]"
          >
            <Box className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">{item.icon}</Box>
            <Box className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
                {item.label}
              </Text>
              {item.description ? <Text className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</Text> : null}
            </Box>
            <Icon node={shellIcons.chevronRight} size="sm" tone="muted" />
          </Pressable>
        ))}
      </Grid>
    </Box>
  );
}
