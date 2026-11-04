import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth/AuthContext";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { AddReminderForm } from "@/components/reminders/AddReminderForm";
import { useLocale } from "@/lib/i18n";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { notifyRemindersChanged, requestSignIn } from "@/lib/menu-request";

/**
 * The "+" in the header and in the iPhone Duo toolbar: a new reminder from any page. On iOS this is the
 * system page sheet (the one Apple Calendar's "+" raises); on Android the app's bottom sheet. Signed out,
 * it opens the sign-in dialog instead — reminders are stored on the account.
 */
export function QuickReminderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useLocale();
  const colors = useThemeColors();
  const l = lang === "en" ? "en" : "ne";
  const { isAuthenticated } = useAuth();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (!isAuthenticated) {
      onClose();
      requestSignIn();
      return;
    }
    let active = true;
    void isCurrentlyOnline().then((net) => {
      if (active) setOnline(net);
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
      <View>
        <AddReminderForm active={open} online={online} onCreated={onCreated} />
        {/* A round X at the top right, like the search sheet's, besides the drag down. */}
        <Pressable
          onPress={() => {
            haptics.tick();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("ui.search.cancel")}
          hitSlop={8}
          className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-60"
        >
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}
