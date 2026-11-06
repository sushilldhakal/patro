import { useCallback } from "react";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { EventForm } from "@/components/events/EventForm";
import { useLocale } from "@/lib/i18n";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { notifyRemindersChanged } from "@/lib/menu-request";

/**
 * The "+" in the header and in the iPhone Duo toolbar. It raises the form straight away, as an event; the
 * form's tabs switch to a task or an appointment (a menu of the three first was one tap too many). On iOS
 * the form is the system page sheet (the one Apple Calendar's "+" raises); on Android the app's bottom
 * sheet. Each has an alert ("Remind me"). Guests get the same form; their events stay on the phone until
 * they sign in (lib/events/api.ts).
 */
export function QuickReminderSheet({ open, date, onClose }: { open: boolean; /** The day the form starts on (a day's card), else today. */ date?: string; onClose: () => void }) {
  const { lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";

  const onCreated = useCallback(async () => {
    onClose();
    await afterRemindersChanged(l, true);
    notifyRemindersChanged();
  }, [l, onClose]);

  return (
    <BottomSheetModal variant="page" visible={open} onClose={onClose} maxHeight="92%">
      {open ? <EventForm initialKind="event" initialDate={date} onClose={onClose} onSaved={() => void onCreated()} /> : null}
    </BottomSheetModal>
  );
}
