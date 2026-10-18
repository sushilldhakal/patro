/**
 * The phone date/location sheet, shared by the website's and the app's
 * `components/patro-date/PatroDateSheet.tsx`: its title, the Date / Location
 * tabs, the Done and Time labels, and the location draft that is only
 * applied on Done (when the nav defers its commits). Each app draws the
 * sheet and its date controls.
 */
import { useState } from "react";
import type { LocationParams } from "@vedic-patro/api-client";
import type { PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";

export type PatroSheetTabId = "date" | "location";
export type PatroSheetNavMode = "year" | "year-month" | "year-month-time";

/** The sheet's date-tab title for a nav: a year nav, or a month (+ time) nav. */
export function patroDateSheetTitleKey(mode: PatroSheetNavMode, showTime: boolean): string {
  if (mode === "year") return "calendar.year_aria";
  return showTime ? "patro_date.date_time" : "patro_date.month_year";
}

/** Same city id is the same place, whatever else rides along. */
function sameLocationParams(a: LocationParams, b: LocationParams): boolean {
  if (a.city_id != null && b.city_id != null) return a.city_id === b.city_id;
  return a.city_id === b.city_id && a.lat === b.lat && a.lon === b.lon && a.city === b.city && a.timezone === b.timezone;
}

export function usePatroDateSheetView({
  open,
  tab,
  dateTitle,
  location,
  onLocationChange,
  deferLocation = false,
}: {
  open: boolean;
  tab: PatroSheetTabId;
  dateTitle: string;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  /** Keep the picked place as a draft until Done (instead of applying it at once). */
  deferLocation?: boolean;
}) {
  const { t } = useLocale();
  const hasLocation = Boolean(location && onLocationChange);
  const onLocationTab = hasLocation && tab === "location";
  const [draftLocation, setDraftLocation] = useState(location);

  // Re-seed the draft whenever the sheet opens or the committed place moves —
  // adjusted during render rather than in an effect that shows a stale frame.
  const [prevSync, setPrevSync] = useState({ open, location });
  if (prevSync.open !== open || prevSync.location !== location) {
    setPrevSync({ open, location });
    if (open && location) setDraftLocation(location);
  }

  const applyLocationDraft = () => {
    if (!onLocationChange || !draftLocation || !location) return;
    if (sameLocationParams(draftLocation.params, location.params)) return;
    onLocationChange(draftLocation);
  };

  return {
    hasLocation,
    onLocationTab,
    headerTitle: onLocationTab ? t("location.choose_location") : dateTitle,
    tabs: (["date", "location"] as const).map((id) => ({
      id,
      label: id === "date" ? dateTitle : t("location.tab"),
      selected: tab === id,
    })),
    /** The place the location panel shows, and what picking one does. */
    panelLocation: deferLocation ? (draftLocation ?? location) : location,
    onPanelLocationChange: deferLocation ? (next: PanchangaLocation) => setDraftLocation(next) : onLocationChange,
    applyLocationDraft,
    labels: {
      done: t("common.done"),
      time: t("common.time"),
      year: t("common.year"),
      chooseLocation: t("location.choose_location"),
    },
  };
}
