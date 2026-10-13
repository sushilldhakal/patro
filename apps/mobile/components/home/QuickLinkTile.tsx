import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

export type QuickLink = {
  href: string;
  label: string;
  icon: DrawerIconName;
  description?: string;
};

/** Web grid gap-3 (12px) between tiles at md+. */
const TILE_GAP = 12;
/** Web `md:max-w-[8rem]`; `lg:max-w-none`. */
const TILE_MAX_AT_MD = 128;

/**
 * One shortcut. Phone: a content-sized chip (icon + label). md+: the website's
 * square tile — icon over a centred label, 5 per row (8 from lg).
 */
export function QuickLinkTile({ link, tileSize }: { link: QuickLink; tileSize?: number }) {
  const router = useRouter();
  const colors = useThemeColors();
  const square = tileSize != null;
  return (
    <Pressable
      onPress={() => router.push(link.href as never)}
      accessibilityRole="button"
      className={cn(
        "border border-border bg-card active:opacity-80",
        square ? homeClasses.quickTile : cn(homeClasses.quickChip, "self-start"),
        square && "max-w-full items-center",
      )}
      style={square ? { width: tileSize, height: tileSize } : undefined}
    >
      <AppNavIcon name={link.icon} size={square ? 28 : 20} color={colors.danger} />
      {/* No numberOfLines / shrink on the chip: it is content-sized, and a single-line,
          shrinkable Text came out a pixel narrower than the bold Devanagari it had
          to draw, so iOS ellipsised it ("बिदा तथा…"). Let the label take its
          natural width; only a label wider than the screen wraps. */}
      <Text
        numberOfLines={square ? 2 : undefined}
        className={cn(homeClasses.quickLabel, square ? "w-full px-0.5 text-center" : "shrink pr-px")}
        style={nepaliTextStyle()}
      >
        {link.label}
      </Text>
    </Pressable>
  );
}

/** Section heading + wrapping chips (md+: centred heading and square tiles). */
export function QuickLinkSection({ title, links }: { title: string; links: QuickLink[] }) {
  const { bp } = useBreakpoint();
  const wide = bp === "tablet" || bp === "desktop";
  const [rowWidth, setRowWidth] = useState(0);
  const perRow = bp === "desktop" ? 8 : 5;
  const raw = rowWidth > 0 ? (rowWidth - TILE_GAP * (perRow - 1)) / perRow : undefined;
  const tileSize = wide && raw != null ? Math.floor(bp === "desktop" ? raw : Math.min(raw, TILE_MAX_AT_MD)) : undefined;
  return (
    <View>
      <Text
        className={cn(
          "mb-3",
          wide ? homeClasses.quickTitleWide : homeClasses.quickTitle,
        )}
        style={nepaliTextStyle()}
      >
        {title}
      </Text>
      <View
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        className={cn(homeClasses.quickRow, wide ? "justify-center gap-3" : "gap-2")}
      >
        {links.map((link) => (
          <QuickLinkTile key={link.href} link={link} tileSize={tileSize} />
        ))}
      </View>
    </View>
  );
}
