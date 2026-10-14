import { Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useSiteFooter } from "@vedic-patro/features/common";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/domain/utils";

/** The links row that closes every page on web (`SiteFooter`): Privacy · Terms · Support · site. */
export function SiteFooter() {
  const links = useSiteFooter();
  const router = useRouter();
  return (
    <View className={shellClasses.footer}>
      <View className={cn("w-full flex-row flex-wrap", shellClasses.footerRow)}>
        {links.map((link) => (
          <Pressable
            key={link.id}
            onPress={() =>
              link.kind === "page" ? router.push(link.path as never) : void Linking.openURL(link.url)
            }
            accessibilityRole="link"
            hitSlop={6}
            className="active:opacity-70"
          >
            <Text className={shellClasses.footerLink} style={nepaliTextStyle()}>
              {link.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
