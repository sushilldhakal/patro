import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { recordAppDay } from "@/lib/review/review-prompt";

/** Counts the days the app is used (for when to ask for a review). Draws nothing. */
export function AppDayTracker() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void recordAppDay();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void recordAppDay();
    });
    return () => sub.remove();
  }, []);
  return null;
}
