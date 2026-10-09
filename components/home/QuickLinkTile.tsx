import { Pressable, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { pushHref } from "@/lib/push-href";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

export type QuickLink = {
  href: string;
  label: string;
  icon: DrawerIconName;
  description?: string;
};

/**
 * One shortcut — a content-sized chip (icon + label) on every screen size.
 */
export function QuickLinkTile({ link }: { link: QuickLink }) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => pushHref(router, pathname, link.href)}
      accessibilityRole="button"
      className="flex-row items-center justify-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm active:opacity-80"
      style={{ maxWidth: "100%", alignSelf: "flex-start" }}
    >
      <AppNavIcon name={link.icon} size={20} color={colors.danger} />
      {/* No numberOfLines / shrink: the chip is content-sized, and a single-line,
          shrinkable Text came out a pixel narrower than the bold Devanagari it had
          to draw, so iOS ellipsised it ("बिदा तथा…"). Let the label take its
          natural width; only a label wider than the screen wraps. */}
      <Text className="text-body font-bold text-foreground" style={[nepaliTextStyle(14), { flexShrink: 1, paddingRight: 2 }]}>
        {link.label}
      </Text>
    </Pressable>
  );
}

/** Section heading + wrapping chips — same compact chips on phone and tablet. */
export function QuickLinkSection({ title, links }: { title: string; links: QuickLink[] }) {
  return (
    <View>
      <Text className="text-body mb-3 font-bold text-foreground" style={nepaliTextStyle(16)}>
        {title}
      </Text>
      <View className="flex-row flex-wrap items-stretch gap-2">
        {links.map((link) => (
          <QuickLinkTile key={link.href} link={link} />
        ))}
      </View>
    </View>
  );
}
