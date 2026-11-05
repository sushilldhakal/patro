import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NEW_EVENT_KINDS, type NewEventKind } from "@vedic-patro/api-client";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { EventForm } from "@/components/events/EventForm";
import { useLocale } from "@/lib/i18n";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { notifyRemindersChanged } from "@/lib/menu-request";

/**
 * The "+" in the header and in the iPhone Duo toolbar. It first lists what can be made — an event, a task
 * or an appointment, in a menu like the view menu's — then raises the form for the pick. On iOS the form
 * is the system page sheet (the one Apple Calendar's "+" raises); on Android the app's bottom sheet. Each
 * has an alert ("Remind me"). Guests get the same form; their events stay on the phone until they sign in
 * (lib/events/api.ts).
 */
export function QuickReminderSheet({ open, date, onClose }: { open: boolean; /** The day the form starts on (a day's card), else today. */ date?: string; onClose: () => void }) {
  const { lang, t } = useLocale();
  const colors = useThemeColors();
  const l = lang === "en" ? "en" : "ne";
  const [online, setOnline] = useState(true);
  const [kind, setKind] = useState<NewEventKind | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!open) return;
    let active = true;
    void isCurrentlyOnline().then((net) => {
      if (active) setOnline(net);
    });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setKind(null);
  }, [open]);

  const onCreated = useCallback(async () => {
    onClose();
    await afterRemindersChanged(l, true);
    notifyRemindersChanged();
  }, [l, onClose]);

  return (
    <>
      <Modal visible={open && kind == null} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t("events.cancel")}>
          <Animated.View entering={ZoomIn.duration(180)} style={{ position: "absolute", top: insets.top + 56, right: 8, minWidth: 260 }}>
            <Animated.View entering={FadeIn.duration(120)} className="overflow-hidden rounded-3xl border border-border bg-card py-2 shadow-lg">
              {NEW_EVENT_KINDS.map((k) => (
                <Pressable
                  key={k}
                  accessibilityRole="menuitem"
                  onPress={() => {
                    haptics.tick();
                    setKind(k);
                  }}
                  className="min-h-12 px-4 py-3 active:bg-muted"
                >
                  <Text className="text-body text-foreground" style={nepaliTextStyle(17)}>
                    {t(`events.kind_${k}`)}
                  </Text>
                  <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
                    {t(`events.kind_${k}_hint`)}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Modal>
      <BottomSheetModal variant="page" visible={open && kind != null} onClose={onClose} maxHeight="92%">
        {open && kind != null ? <EventForm initialKind={kind} initialDate={date} onClose={onClose} onSaved={() => void onCreated()} /> : null}
      </BottomSheetModal>
    </>
  );
}
