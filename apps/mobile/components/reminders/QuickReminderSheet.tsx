import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { AddReminderForm } from "@/components/reminders/AddReminderForm";
import { useLocale } from "@/lib/i18n";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { notifyRemindersChanged, requestSignIn } from "@/lib/menu-request";

/**
 * The "+" in the header and in the iPhone Duo toolbar: a new reminder from any page. On iOS this is the
 * system page sheet (the one Apple Calendar's "+" raises); on Android the app's bottom sheet. Signed out,
 * it opens the sign-in dialog instead — reminders are stored on the account.
 */
export function QuickReminderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (!isAuthenticated) {
      onClose();
      requestSignIn();
      return;
    }
    let active = true;
    void Promise.all([notifStore.getProfiles(), isCurrentlyOnline()]).then(([p, net]) => {
      if (!active) return;
      setProfiles(p);
      setOnline(net);
    });
    return () => {
      active = false;
    };
  }, [open, isAuthenticated, onClose]);

  const onCreated = useCallback(async () => {
    onClose();
    await afterRemindersChanged(l, true);
    notifyRemindersChanged();
  }, [l, onClose]);

  return (
    <BottomSheetModal variant="page" visible={open && isAuthenticated} onClose={onClose} maxHeight="88%">
      <AddReminderForm active={open} profiles={profiles} online={online} onCreated={onCreated} />
    </BottomSheetModal>
  );
}
