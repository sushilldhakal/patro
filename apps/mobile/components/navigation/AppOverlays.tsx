import { useCallback, useState } from "react";
import { NavDrawerHost } from "@/components/AppHeader";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { QuickReminderSheet } from "@/components/reminders/QuickReminderSheet";
import { FestivalSearchSheet } from "@/components/search/FestivalSearchSheet";
import { LocationSearchSheet } from "@/components/search/LocationSearchSheet";
import { useAddReminderRequest, useLocationPickerRequest, useSearchRequest, useSignInRequest } from "@/lib/menu-request";

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
  useLocationPickerRequest(useCallback(() => setPlaceOpen(true), []));
  useSignInRequest(useCallback(() => setAuthOpen(true), []));
  useSearchRequest(useCallback(() => setSearchOpen(true), []));
  useAddReminderRequest(useCallback(() => setReminderOpen(true), []));
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeReminder = useCallback(() => setReminderOpen(false), []);
  const closePlace = useCallback(() => setPlaceOpen(false), []);
  return (
    <>
      <NavDrawerHost />
      <FestivalSearchSheet open={searchOpen} onClose={closeSearch} />
      <QuickReminderSheet open={reminderOpen} onClose={closeReminder} />
      {/* The place picker, drawn like search; every screen's usePanchangaLocation follows what is picked here. */}
      <LocationSearchSheet open={placeOpen} onClose={closePlace} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
    </>
  );
}
