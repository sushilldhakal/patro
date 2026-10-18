import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { HomeRashifalSignPicker } from "@/components/home/HomeRashifalSignPicker";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  fetchPersonalRashifal,
  fetchRashifal,
  rashifalKeys,
  type LocationParams,
  type RashifalSignBlock,
} from "@/lib/api";
import { instantCacheKey } from "@vedic-patro/domain/calendar/instant-query";
import { profileChartParams } from "@vedic-patro/read-models/jyotish/kundali/profile-chart";
import { useProfilesQuery } from "@/lib/kundali/profiles-query";
import { useLocale } from "@/lib/i18n";
import { rashifalMonthLabel } from "@/lib/rashifal-ui";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  dateAd: string;
  location: LocationParams;
  contentInset?: number;
};

/** Home monthly rashifal — mirrors web {@link HomeRashifalTeaser}. */
export function HomeRashifalSection({ dateAd, location, contentInset = 0 }: Props) {
  const router = useRouter();
  const { lang, t } = useLocale();
  const { width } = useBreakpoint();
  /* Web: below md only the Sun-sign (or personal) card; md+ adds the rashi picker. */
  const showPicker = width >= 768;
  const { isAuthenticated } = useAuth();
  const { data: profiles } = useProfilesQuery(isAuthenticated);

  const defaultProfile = profiles?.find((p) => p.is_default) ?? null;
  const profileChart = defaultProfile ? profileChartParams(defaultProfile) : null;
  const hasUsableProfile = Boolean(
    defaultProfile &&
      profileChart &&
      profileChart.location.params.lat != null &&
      profileChart.location.params.lon != null,
  );

  const personalQ = useQuery({
    queryKey: rashifalKeys.personal(
      dateAd,
      "monthly",
      defaultProfile?.id ?? "",
      location,
      profileChart ? instantCacheKey(profileChart.moment) : "",
    ),
    queryFn: () =>
      fetchPersonalRashifal(
        dateAd,
        "monthly",
        {
          moment: profileChart!.moment,
          birthLat: profileChart!.location.params.lat as number,
          birthLon: profileChart!.location.params.lon as number,
          birthTz: profileChart!.location.params.timezone ?? "Asia/Kathmandu",
        },
        location,
      ),
    enabled: hasUsableProfile && Boolean(defaultProfile?.id),
    staleTime: 1000 * 60 * 10,
  });

  const generalQ = useQuery({
    queryKey: rashifalKeys.block(dateAd, "monthly", location),
    queryFn: () => fetchRashifal(dateAd, "monthly", location),
    enabled: !hasUsableProfile,
    staleTime: 1000 * 60 * 30,
  });

  const loading = hasUsableProfile ? personalQ.isLoading : generalQ.isLoading;
  const monthLabel = hasUsableProfile
    ? rashifalMonthLabel(personalQ.data, lang)
    : rashifalMonthLabel(generalQ.data, lang);

  const sunSign: RashifalSignBlock | undefined =
    generalQ.data?.signs?.length && generalQ.data.frame?.sun_sign
      ? (generalQ.data.signs.find((s) => s.id === generalQ.data!.frame!.sun_sign) ??
        generalQ.data.signs[0])
      : undefined;

  const hasContent = hasUsableProfile
    ? Boolean(personalQ.data)
    : Boolean(generalQ.data?.signs?.length);

  if (!loading && !hasContent) return null;

  return (
    <View style={{ paddingHorizontal: contentInset }}>
      <View className={homeClasses.rashifalHeader}>
        <Text
          className={homeClasses.rashifalTitle}
          style={nepaliTextStyle()}
        >
          {t("home_rashifal.section_title")}
        </Text>
        {monthLabel ? (
          <Text className={homeClasses.rashifalMonth} style={nepaliTextStyle()}>
            {monthLabel}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View className="py-12">
          <VedicPatroLoader />
        </View>
      ) : hasUsableProfile && personalQ.data && defaultProfile ? (
        <View className={showPicker ? "mx-auto w-full max-w-lg" : undefined}>
          <RashifalPersonalCard name={defaultProfile.full_name} personal={personalQ.data} />
        </View>
      ) : generalQ.data?.signs?.length ? (
        showPicker ? (
          <HomeRashifalSignPicker
            signs={generalQ.data.signs}
            period="monthly"
            defaultSignId={generalQ.data.frame?.sun_sign ?? sunSign?.id}
            contentInset={contentInset}
          />
        ) : sunSign ? (
          <RashifalSignCard sign={sunSign} period="monthly" />
        ) : null
      ) : null}

      {!loading && hasContent ? (
        <View className={homeClasses.rashifalLinks}>
          <Pressable onPress={() => router.push("/jyotish/rashifal")}>
            <Text className={homeClasses.rashifalLinkPrimary} style={nepaliTextStyle()}>
              {hasUsableProfile ? t("home_rashifal.see_full") : t("home_rashifal.see_yours")} →
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: "/jyotish/rashifal", params: { period: "daily" } })}>
            <Text className={homeClasses.rashifalLinkSecondary} style={nepaliTextStyle()}>
              {t("home_rashifal.see_daily")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
