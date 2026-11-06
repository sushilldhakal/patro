import { Alert, Linking } from "react-native";
import { markPhoneCalendarAsked, phoneCalendarAccess, phoneCalendarPermission, shouldAskForPhoneCalendar, syncPhoneCalendars } from "./device-calendars";

type T = (key: string) => string;

/**
 * Ask for calendar access (the system popup) and, once given, sync both ways straight away.
 * Returns whether access is now granted.
 */
export async function allowPhoneCalendar(): Promise<boolean> {
  await markPhoneCalendarAsked();
  const ok = await phoneCalendarPermission(true);
  if (ok) void syncPhoneCalendars();
  return ok;
}

/**
 * After a new task, event or appointment is saved: when calendar access is not on, offer it again
 * (at most once a week after a "Not now"). iOS shows its own popup only once, so after a refusal
 * this offers Settings instead.
 */
export async function offerPhoneCalendarAfterSave(t: T): Promise<void> {
  if (!(await shouldAskForPhoneCalendar())) return;
  const access = await phoneCalendarAccess();
  if (access === "granted" || access === "unavailable") return;
  await markPhoneCalendarAsked();
  const settings = access === "settings";
  Alert.alert(t("events.phone_ask_after_save"), settings ? t("events.phone_ask_settings_body") : t("events.phone_ask_body"), [
    { text: t("events.phone_ask_later"), style: "cancel" },
    {
      text: settings ? t("events.phone_ask_settings") : t("events.phone_ask_allow"),
      onPress: () => {
        if (settings) void Linking.openSettings();
        else void allowPhoneCalendar();
      },
    },
  ]);
}
