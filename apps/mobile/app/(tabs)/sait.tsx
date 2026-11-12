import { View } from "react-native";
import { getCurrentBs, shiftBsMonth } from "@vedic-patro/domain/calendar/bs-calendar";
import { getPanchangaSidebarSections } from "@vedic-patro/features/panchanga";
import { AppShell } from "@/components/AppShell";
import { SaitAsidePanel } from "@/components/home/SaitAsidePanel";
import { QuickLinkSection, type QuickLink } from "@/components/home/QuickLinkTile";
import { withDuoRailInset } from "@/components/navigation/DuoSceneInset";
import { Text } from "@/components/ui/Text";
import { resolveDrawerIcon } from "@/lib/drawer-icons";
import { elementHref } from "@/lib/element-routes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/** One month's sait in a card, under its heading. */
function MonthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
        {title}
      </Text>
      <View className="rounded-2xl border border-border bg-card p-3">{children}</View>
    </View>
  );
}

/**
 * The साइत tab: what most people open a patro for after today's date. This month's and next month's
 * auspicious days per ceremony (today highlighted), every ceremony's full-year page, and today's
 * good-hour tables (choghadiya, hora, lagna…). Each ceremony page browses its own year.
 */
function SaitScreen() {
  const { t } = useLocale();
  const { location } = usePanchangaLocation();
  const today = getCurrentBs();
  const next = shiftBsMonth(today.year, today.month, 1);

  const sections = getPanchangaSidebarSections();
  const items = (id: string) => sections.find((s) => s.id === id)?.items ?? [];
  const ceremonies: QuickLink[] = items("sait").map((item) => ({
    href: `/sait/${item.params?.category ?? item.id}`,
    label: t(item.labelKey),
    icon: resolveDrawerIcon("sait", item.id),
  }));
  const daily: QuickLink[] = [
    { href: "/abhijit-muhurta", label: t("sidebar_nav.items.abhijit.label"), icon: resolveDrawerIcon("jyotish", "abhijit") },
    ...items("tables").map((item) => ({
      href: elementHref(item.params?.name ?? item.id),
      label: t(item.labelKey),
      icon: resolveDrawerIcon("tables", item.id),
    })),
  ];

  return (
    <AppShell title={t("panchanga.tabs.sait")} subtitle={t("sait_hub.subtitle")}>
      <View className="gap-6">
        <MonthCard title={t("sait_hub.this_month")}>
          <SaitAsidePanel year={today.year} month={today.month} highlightDay={today.day} location={location.params} />
        </MonthCard>
        <QuickLinkSection title={t("sait_hub.ceremonies")} links={ceremonies} />
        <QuickLinkSection title={t("sait_hub.daily")} links={daily} />
        <MonthCard title={t("sait_hub.next_month")}>
          <SaitAsidePanel year={next.year} month={next.month} location={location.params} />
        </MonthCard>
      </View>
    </AppShell>
  );
}

export default withDuoRailInset(SaitScreen);
