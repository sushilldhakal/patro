import { useQueryClient } from "@tanstack/react-query";
import type { CalendarEvent } from "@vedic-patro/api-client";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { EventForm } from "@/components/events/EventForm";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { notifyRemindersChanged } from "@/lib/menu-request";
import { useLocale } from "@/lib/i18n";

/** The form in a sheet to change an event, or to start one at a tapped slot of the day or week grid. */
export function EventEditSheet({ editor, onClose }: { editor: { event?: CalendarEvent; slot?: { date: string; time: string } } | null; onClose: () => void }) {
  const { lang } = useLocale();
  const queryClient = useQueryClient();
  return (
    <BottomSheetModal variant="page" visible={editor != null} onClose={onClose} maxHeight="92%">
      {editor ? (
        <EventForm
          initialKind={editor.slot ? "appointment" : "event"}
          editing={editor.event}
          slot={editor.slot}
          onClose={onClose}
          onSaved={() => {
            onClose();
            void queryClient.invalidateQueries({ queryKey: ["events"] });
            void afterRemindersChanged(lang === "en" ? "en" : "ne", true);
            notifyRemindersChanged();
          }}
        />
      ) : null}
    </BottomSheetModal>
  );
}
