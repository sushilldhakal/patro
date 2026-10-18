import Svg, { Path } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { useGocharPromoCard } from "@vedic-patro/features/gochar";
import { gocharClasses as g } from "@vedic-patro/design-tokens/classes/gochar-classes";
import type { GocharPromoCardProps } from "../contract";
import { arrowRightIcon, orbitIcon } from "../icons";

export function GocharPromoCard({ onPress, className, compact }: GocharPromoCardProps) {
  const copy = useGocharPromoCard();
  const { colorScheme } = useColorScheme();
  const arrow = mobileRoles(colorScheme === "dark" ? "dark" : "light").secondaryForeground;

  return (
    <Pressable
      onPress={onPress}
      label={copy.title}
      className={cn(g.promoCard, "bg-card", className)}
      nativeClassName="active:opacity-90 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <Box className="min-w-0 flex-row items-start gap-3" nativeClassName="sm:flex-1">
        <Box className={g.promoIcon}>
          <Icon node={orbitIcon} size={24} tone="secondary" strokeWidth={1.75} />
        </Box>
        <Box className="min-w-0 flex-1">
          <Text className={g.promoTitle}>{copy.title}</Text>
          {!compact ? <Text className={g.promoBody}>{copy.body}</Text> : null}
        </Box>
      </Box>
      <Box className={g.promoCta} nativeClassName="mt-3 flex-row sm:mt-0">
        <Text className={g.promoCtaText}>{copy.cta}</Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          {arrowRightIcon.map(([tag, attrs], index) => (
            <Path
              key={index}
              d={String(attrs.d)}
              stroke={arrow}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </Box>
    </Pressable>
  );
}
