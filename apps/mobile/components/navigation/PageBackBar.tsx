import { View } from "react-native";
import { useRouter } from "expo-router";
import { UiIcon } from "@vedic-patro/ui/kit/weather";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { PressScale } from "@/components/weather/WeatherPlacesScreen";
import { Text } from "@/components/ui/Text";
import { useHeaderHasBack } from "@/lib/header-back";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

/**
 * The app's page bar (iPhone, iPad, iPhone Duo, Android): back key on the left, the page's title (and a
 * second line, e.g. "Mandala 1") in the middle, the bar's search key on the right. It stays put while the
 * page scrolls. The website draws nothing here and keeps the page's own "← back" link (useHeaderHasBack).
 */
export function PageBackBar({ title, subtitle, fallback }: { title: string; subtitle?: string | null; fallback: string }) {
  const { t } = useLocale();
  const router = useRouter();
  if (!useHeaderHasBack()) return null;
  return (
    <TopBarSlot pinned>
      <View className="flex-1 flex-row items-center">
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={t("ui.account.back")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as never))}
          hitSlop={8}
          className="-ml-2 size-11 items-center justify-center"
        >
          <UiIcon name="arrow-left" size={24} tone="foreground" />
        </PressScale>
        {/* Between the back key and the search key, which are the same width: centred on the screen. */}
        <View className="min-w-0 flex-1 items-center justify-center px-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1} accessibilityRole="header" style={nepaliTextStyle(16)}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-caption font-semibold text-secondary" numberOfLines={1} style={nepaliTextStyle(13)}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </TopBarSlot>
  );
}
