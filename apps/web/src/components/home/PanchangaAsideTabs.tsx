import { lazy, Suspense } from "react";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { importWithRetry } from "@/lib/lazy-route";
import { PanchangaVivaranPanel } from "@/components/home/PanchangaVivaranPanel";

// Secondary tabs — only mount when the user selects them, so keep their code
// (and the heavy timeline/sait data they pull in) out of the eager home bundle.
const SaitAsidePanel = lazy(() =>
  importWithRetry(() => import("@/components/home/SaitAsidePanel")).then((m) => ({
    default: m.SaitAsidePanel,
  })),
);
const MuhurtaAsidePanel = lazy(() =>
  importWithRetry(() => import("@/components/home/MuhurtaAsidePanel")).then((m) => ({
    default: m.MuhurtaAsidePanel,
  })),
);

function TabFallback() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export type AsideTabId = "panchanga" | "sait" | "muhurta";

export const ASIDE_TAB_IDS: AsideTabId[] = ["panchanga", "sait", "muhurta"];

type Props = {
  tab: AsideTabId;
  p?: PanchangaDay;
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  location: PanchangaLocation;
  bsYear: number;
  bsMonth: number;
  /** Set only while the calendar is in AD mode — see SaitAsidePanel. */
  adYear?: number;
  adMonth?: number;
  loading?: boolean;
};

export function PanchangaAsideTabPanel({
  tab,
  p,
  selectedDay,
  selectedAdDate,
  location,
  bsYear,
  bsMonth,
  adYear,
  adMonth,
  loading,
}: Props) {
  const isAd = adYear != null && adMonth != null;
  // The saait list is keyed by whichever era it renders, so highlight the
  // selected day in that era too.
  const saitHighlightDay = isAd
    ? (() => {
        const ad = selectedDay?.date_ad ?? selectedAdDate;
        const d = ad ? new Date(`${ad}T12:00:00`) : null;
        return d && d.getFullYear() === adYear && d.getMonth() + 1 === adMonth
          ? d.getDate()
          : undefined;
      })()
    : selectedDay?.day;
  if (loading) {
    return tab === "panchanga" ? (
      <PanchangaVivaranPanel loading bsYear={bsYear} bsMonth={bsMonth} location={location} selectedAdDate={selectedAdDate} />
    ) : tab === "sait" ? (
      <Suspense fallback={<TabFallback />}>
        <SaitAsidePanel year={bsYear} month={bsMonth} adYear={adYear} adMonth={adMonth} location={location} />
      </Suspense>
    ) : (
      <TabFallback />
    );
  }

  if (tab === "sait") {
    return (
      <Suspense fallback={<TabFallback />}>
        <SaitAsidePanel
          year={bsYear}
          month={bsMonth}
          adYear={adYear}
          adMonth={adMonth}
          location={location}
          highlightDay={saitHighlightDay}
        />
      </Suspense>
    );
  }

  if (!p) return null;

  switch (tab) {
    case "panchanga":
      return (
        <PanchangaVivaranPanel
          p={p}
          selectedDay={selectedDay}
          selectedAdDate={selectedAdDate}
          location={location}
          bsYear={bsYear}
          bsMonth={bsMonth}
        />
      );
    case "muhurta":
      return (
        <Suspense fallback={<TabFallback />}>
          <MuhurtaAsidePanel p={p} dateAd={selectedAdDate} />
        </Suspense>
      );
    default:
      return null;
  }
}
