import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getClockStyle, setClockStyle, type ClockStyle } from "@vedic-patro/domain/calendar/clock-style";

/** The reader's 12 / 24-hour clock (Preferences → General), kept on the device and loaded at start. */
const KEY = "clockStyle";
const listeners = new Set<() => void>();

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw === "12" || raw === "24") {
      setClockStyle(raw);
      listeners.forEach((fn) => fn());
    }
  })
  .catch(() => {});

export function chooseClockStyle(next: ClockStyle) {
  setClockStyle(next);
  listeners.forEach((fn) => fn());
  void AsyncStorage.setItem(KEY, next).catch(() => {});
}

/** The chosen clock, or null (each screen's own default). */
export function useClockStyle(): ClockStyle | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getClockStyle,
  );
}
