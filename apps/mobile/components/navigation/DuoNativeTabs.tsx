import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DuoToolbar } from "@/components/navigation/DuoToolbar";
import { DuoBottomActions } from "@/components/FloatingNavBar";
import { planRail, useDuoRail } from "@/lib/duo-rail";
import { useLocale } from "@/lib/i18n";
import { FLOATING_NAV } from "@/lib/mobile-nav";

/** SF Symbol per tab, in `FLOATING_NAV` order (home, panchanga, kundali, transit, vastu, learn). */
const TAB_SF = ["house", "calendar", "sparkles", "moon", "safari", "book"] as const;

/** Route name per tab, in `FLOATING_NAV` order. */
const TAB_ROUTE = ["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"] as const;

/**
 * iPhone Duo only. iOS 27.1 moves the bars it owns (the tab bar and the native header's toolbar)
 * into a vertical rail beside the app, on the side the app sits on, and back to horizontal bars in
 * portrait (Expo's iPhone Duo guide). So the tabs are the system tab bar and the header actions are
 * native toolbar items, icons only. When the rail is short, the least used tabs are left out of it.
 * Every other device keeps the floating bar and the JS header.
 */
export function DuoNativeTabs() {
  const { pick } = useLocale();
  const { slots, folded } = useDuoRail();
  const plan = planRail(slots, folded);
  return (
    <>
      <DuoToolbar tabsInBar />
      <NativeTabs>
        {FLOATING_NAV.map((item, i) => (
          <NativeTabs.Trigger key={TAB_ROUTE[i]} name={TAB_ROUTE[i]} hidden={!plan.tabs.has(TAB_ROUTE[i])}>
            <NativeTabs.Trigger.Icon sf={TAB_SF[i]} />
            <NativeTabs.Trigger.Label>{pick(item.ne, item.en)}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
      {/* Portrait: search and "+" left of the system tab bar, place and settings right of it. */}
      <DuoBottomActions />
    </>
  );
}
