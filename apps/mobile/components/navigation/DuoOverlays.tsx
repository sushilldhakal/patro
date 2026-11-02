import { useCallback, useState } from "react";
import { NavDrawerHost } from "@/components/AppHeader";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useSignInRequest } from "@/lib/menu-request";

/**
 * The side menu and the sign-in dialog for the iPhone Duo's native toolbar. They live at the root,
 * above every screen, because the toolbar buttons are native and the tab screen under a pushed page
 * is frozen: a dialog owned by it would never redraw.
 */
export function DuoOverlays() {
  const [authOpen, setAuthOpen] = useState(false);
  useSignInRequest(useCallback(() => setAuthOpen(true), []));
  return (
    <>
      <NavDrawerHost />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
    </>
  );
}
