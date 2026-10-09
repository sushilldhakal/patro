import { ensureNotificationPermission } from "./permissions";
import { registerThisDevice } from "./register-device";
import { syncNotifications } from "./sync";

/**
 * Called after a profile is saved. A brand-new profile is the natural moment to
 * ask for notification permission — the user has just said "this person matters"
 * — and it gets its first daily briefing scheduled straight away.
 */
export async function afterProfileSaved(lang: "ne" | "en", isNew: boolean): Promise<void> {
  try {
    if (isNew) await ensureNotificationPermission();
    await syncNotifications({ lang, force: true });
    if (isNew) await registerThisDevice(lang);
  } catch {
    /* notifications are an extra — never break saving a profile */
  }
}

export async function afterProfileDeleted(lang: "ne" | "en"): Promise<void> {
  try {
    await syncNotifications({ lang, force: true });
  } catch {
    /* see above */
  }
}

/** Called after a reminder is created/changed/removed so the schedule reflects it at once. */
export async function afterRemindersChanged(lang: "ne" | "en", askPermission: boolean): Promise<boolean> {
  try {
    const granted = askPermission ? await ensureNotificationPermission() : true;
    await syncNotifications({ lang });
    return granted;
  } catch {
    return false;
  }
}
