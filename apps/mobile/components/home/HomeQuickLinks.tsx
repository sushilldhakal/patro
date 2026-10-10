import { View } from "react-native";
import { QuickLinkSection, type QuickLink } from "@/components/home/QuickLinkTile";
import { useLocale } from "@/lib/i18n";
import { defaultPanchakPatroYear } from "@vedic-patro/domain/panchak/panchak-patro-data";

/** Shortcut tiles under the calendar — same two groups and order as the web home. */
export function HomeQuickLinks() {
  const { t, pick, digits } = useLocale();

  const patro: QuickLink[] = [
    { href: "/holidays", label: t("nav.holidays"), icon: "party-popper" },
    { href: "/converter", label: t("nav.converter"), icon: "arrow-left-right" },
    { href: "/suryakranti", label: t("nav.suryakranti"), icon: "sunrise" },
    { href: "/panchanga/year", label: t("panchanga_year.title"), icon: "calendar-range" },
    { href: "/dainikkranti", label: t("nav.dainikkranti"), icon: "moon" },
    { href: "/panchak-patro", label: t("panchak.title", { year: digits(defaultPanchakPatroYear()) }), icon: "calendar-clock" },
    { href: "/ritu", label: t("ritu.title"), icon: "sprout" },
  ];
  const jyotish: QuickLink[] = [
    { href: "/panchanga/avakahada-chakra", label: t("nav.avakahada_chakra"), icon: "grid-3x3" },
    { href: "/abhijit-muhurta", label: t("nav.abhijit_muhurta"), icon: "sparkles" },
    { href: "/kundali", label: t("home_quick.kundali_build_title"), icon: "sparkles" },
    { href: "/jyotish/kundali-milan", label: t("home_quick.kundali_milan_title"), icon: "heart" },
    { href: "/documents", label: t("nav.documents"), icon: "file-text" },
  ];

  return (
    <View className="gap-8">
      <QuickLinkSection title={pick("पात्रो तथा मिति", "Patro & dates")} links={patro} />
      <QuickLinkSection title={pick("ज्योतिष तथा मुहूर्त", "Jyotish & moment")} links={jyotish} />
    </View>
  );
}
