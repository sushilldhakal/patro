import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { defaultPanchakPatroYear } from "@/lib/panchak/panchak-patro-data";
import { useThemeColors } from "@/lib/theme-context";

type Tile = { href: string; label: string; icon: DrawerIconName };

function TileRow({ title, tiles }: { title: string; tiles: Tile[] }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <View>
      <Text className="mb-3 text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {tiles.map((tile) => (
          <Pressable
            key={tile.href}
            onPress={() => router.push(tile.href as never)}
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 active:opacity-80"
          >
            <AppNavIcon name={tile.icon} size={20} color={colors.danger} />
            <Text className="text-sm font-bold text-foreground" style={nepaliTextStyle(14)} numberOfLines={1}>
              {tile.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Shortcut tiles under the calendar — same two groups and order as the web home. */
export function HomeQuickLinks() {
  const { t, pick, digits } = useLocale();

  const patro: Tile[] = [
    { href: "/holidays", label: t("nav.holidays"), icon: "party-popper" },
    { href: "/converter", label: t("nav.converter"), icon: "arrow-left-right" },
    { href: "/suryakranti", label: t("nav.suryakranti"), icon: "sunrise" },
    { href: "/panchanga/year", label: t("panchanga_year.title"), icon: "calendar-range" },
    { href: "/dainikkranti", label: t("nav.dainikkranti"), icon: "moon" },
    { href: "/panchak-patro", label: t("panchak.title", { year: digits(defaultPanchakPatroYear()) }), icon: "calendar-clock" },
    { href: "/ritu", label: t("ritu.title"), icon: "sprout" },
  ];
  const jyotish: Tile[] = [
    { href: "/panchanga/avakahada-chakra", label: t("nav.avakahada_chakra"), icon: "grid-3x3" },
    { href: "/abhijit-muhurta", label: t("nav.abhijit_muhurta"), icon: "sparkles" },
    { href: "/kundali", label: t("home_quick.kundali_build_title"), icon: "sparkles" },
    { href: "/jyotish/kundali-milan", label: t("home_quick.kundali_milan_title"), icon: "heart" },
    { href: "/documents", label: t("nav.documents"), icon: "file-text" },
  ];

  return (
    <View className="gap-8">
      <TileRow title={pick("पात्रो तथा मिति", "Patro & dates")} tiles={patro} />
      <TileRow title={pick("ज्योतिष तथा मुहूर्त", "Jyotish & moment")} tiles={jyotish} />
    </View>
  );
}
