import { useCallback, useState } from "react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { AddReminderForm } from "./AddReminderForm";

export type ReminderTarget = {
  /** `WINDOW_OPTIONS` key; the form starts on it. */
  windowKey?: string;
  /** Shown under the title, e.g. "राहु काल · १०:३० – १२:००". */
  subtitle?: string;
};

/**
 * What every "set a reminder" entry point needs before the form: a signed-in user (reminders
 * live on the server), the cached profiles and whether we are online.
 */
export function useReminderPrep() {
  const { isAuthenticated } = useAuth();
  const { lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const [authOpen, setAuthOpen] = useState(false);
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [online, setOnline] = useState(true);

  /** Loads what the form needs; false (and the sign-in dialog) when signed out. */
  const prepare = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return false;
    }
    const [cached, net] = await Promise.all([notifStore.getProfiles(), isCurrentlyOnline()]);
    setProfiles(cached);
    setOnline(net);
    return true;
  }, [isAuthenticated]);

  const created = useCallback(() => afterRemindersChanged(l, true), [l]);

  const authDialog = <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />;

  return { prepare, profiles, online, created, authDialog };
}

/** A "new reminder" sheet that any page can open on a given window. */
export function useWindowReminder() {
  const prep = useReminderPrep();
  const [target, setTarget] = useState<ReminderTarget | null>(null);

  const open = useCallback(
    async (next: ReminderTarget) => {
      if (await prep.prepare()) setTarget(next);
    },
    [prep.prepare],
  );

  const element = (
    <>
      <BottomSheetModal visible={target != null} onClose={() => setTarget(null)} maxHeight="88%">
        <AddReminderForm
          active={target != null}
          profiles={prep.profiles}
          online={prep.online}
          initialKey={target?.windowKey}
          subtitle={target?.subtitle}
          onCreated={async () => {
            setTarget(null);
            await prep.created();
          }}
        />
      </BottomSheetModal>
      {prep.authDialog}
    </>
  );

  return { open, element };
}
