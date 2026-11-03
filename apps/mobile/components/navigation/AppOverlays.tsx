import { useCallback, useState } from "react";
import { NavDrawerHost } from "@/components/AppHeader";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { QuickReminderSheet } from "@/components/reminders/QuickReminderSheet";
import { FestivalSearchSheet } from "@/components/search/FestivalSearchSheet";
import { PatroHeaderLocation } from "@vedic-patro/ui/kit/shell";
import { locateDevice } from "@/components/panchanga/locate-device";
import { useAddReminderRequest, useLocationPickerRequest, useSearchRequest, useSignInRequest } from "@/lib/menu-request";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

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
  const { location, setLocation } = usePanchangaLocation();
  useLocationPickerRequest(useCallback(() => setPlaceOpen(true), []));
  useSignInRequest(useCallback(() => setAuthOpen(true), []));
  useSearchRequest(useCallback(() => setSearchOpen(true), []));
  useAddReminderRequest(useCallback(() => setReminderOpen(true), []));
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeReminder = useCallback(() => setReminderOpen(false), []);
  return (
    <>
      <NavDrawerHost />
      <FestivalSearchSheet open={searchOpen} onClose={closeSearch} />
      <QuickReminderSheet open={reminderOpen} onClose={closeReminder} />
      {/* The place picker's sheet alone; every screen's usePanchangaLocation follows what is picked here. */}
      <PatroHeaderLocation
        buttonless
        location={location}
        onLocationChange={setLocation}
        locate={locateDevice}
        open={placeOpen}
        onOpenChange={setPlaceOpen}
      />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
    </>
  );
}
