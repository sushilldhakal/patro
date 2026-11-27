import { useCallback, useState } from "react";
import { NavDrawerHost } from "@/components/AppHeader";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { QuickReminderSheet } from "@/components/reminders/QuickReminderSheet";
import { FestivalSearchSheet } from "@/components/search/FestivalSearchSheet";
import { LocationPlacesScreen } from "@/components/search/LocationPlacesScreen";
import { useAddReminderRequest, useLocationPickerRequest, useSearchRequest, useSignInRequest, type PlacePick } from "@/lib/menu-request";

/**
 * The side menu, festival search, new-reminder sheet, place picker and sign-in dialog, once, at the root, above every
 * screen. The header buttons (every phone) and the iPhone Duo's native toolbar only send a request; a
 * dialog owned by a page would never redraw on the frozen tab screen under a pushed page, and a header
 * on each stacked page would open one copy per page.
 */
export function AppOverlays() {
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placePick, setPlacePick] = useState<{ fn: PlacePick } | null>(null);
  useLocationPickerRequest(
    useCallback((onPick?: PlacePick) => {
      setPlacePick(onPick ? { fn: onPick } : null);
      setPlaceOpen(true);
    }, []),
  );
  useSignInRequest(useCallback(() => setAuthOpen(true), []));
  useSearchRequest(useCallback(() => setSearchOpen(true), []));
  const [reminderDate, setReminderDate] = useState<string | undefined>(undefined);
  useAddReminderRequest(
    useCallback((date?: string) => {
      setReminderDate(date);
      setReminderOpen(true);
    }, []),
  );
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeReminder = useCallback(() => setReminderOpen(false), []);
  const closePlace = useCallback(() => setPlaceOpen(false), []);
  return (
    <>
      <NavDrawerHost />
      <FestivalSearchSheet open={searchOpen} onClose={closeSearch} />
      <QuickReminderSheet open={reminderOpen} date={reminderDate} onClose={closeReminder} />
      {/* The place picker, drawn like the weather places screen; every screen's usePanchangaLocation follows it. */}
      <LocationPlacesScreen open={placeOpen} onClose={closePlace} onPick={placePick?.fn} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
    </>
  );
}
