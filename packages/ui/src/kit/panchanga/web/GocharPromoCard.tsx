import { createElement } from "react";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useGocharPromoCard } from "@vedic-patro/features/gochar";
import { gocharClasses as g } from "@vedic-patro/design-tokens/classes/gochar-classes";
import type { GocharPromoCardProps } from "../contract";
import { arrowRightIcon, orbitIcon } from "../icons";

export function GocharPromoCard({ onPress, className, compact }: GocharPromoCardProps) {
  const copy = useGocharPromoCard();
  return (
    <Pressable
      onPress={onPress}
      label={copy.title}
      className={cn(g.promoCard, className)}
      webClassName="group relative block w-full bg-gradient-to-br from-card via-card to-secondary/[0.08] shadow-ring-soft transition-[border-color,box-shadow] hover:border-secondary/40 hover:shadow-md"
    >
      <Box className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-secondary/10 blur-2xl" />
      <Box webClassName="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Box webClassName="flex min-w-0 items-start gap-3">
          <Box className={g.promoIcon} webClassName="flex">
            <Icon node={orbitIcon} size={24} tone="secondary" strokeWidth={1.75} />
          </Box>
          <Box className="min-w-0">
            <Text as="h2" className={cn("m-0", g.promoTitle)}>
              {copy.title}
            </Text>
            {!compact ? (
              <Text as="p" className={cn("mb-0", g.promoBody)}>
                {copy.body}
              </Text>
            ) : null}
          </Box>
        </Box>
        <Box
          className={cn(g.promoCta, g.promoCtaText)}
          webClassName="inline-flex transition-colors group-hover:bg-secondary/90"
        >
          {copy.cta}
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          >
            {arrowRightIcon.map(([tag, attrs], index) => {
              const { key: _key, ...rest } = attrs;
              return createElement(tag, { key: index, ...rest });
            })}
          </svg>
        </Box>
      </Box>
    </Pressable>
  );
}
