import { Redirect, useLocalSearchParams } from "expo-router";

/** Reminders now live in Events → Tasks (with the शुभ/अशुभ window that a home-page bell asked for). */
export default function RemindersRedirect() {
  const { window } = useLocalSearchParams<{ window?: string }>();
  return <Redirect href={{ pathname: "/account/events", params: { tab: "task", ...(window ? { window } : {}) } } as never} />;
}
