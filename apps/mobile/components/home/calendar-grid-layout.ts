import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DURATION, EASE_OUT, SHIFT, useReducedMotionPref } from "@vedic-patro/ui/motion";

/** Horizontal swipe to change month. Off until it has been feel-checked on device. */
export const MONTH_SWIPE_ENABLED = false;

const TODAY_PULSE_KEY = "vedic-patro.today-cell-pulse";

export type TodayPulseApi = {
  seen: (todayAd: string) => boolean;
  mark: (todayAd: string) => void;
  subscribe: (listener: () => void) => () => void;
};

function installTodayPulse(): TodayPulseApi {
  let date: string | null = null;
  let ready = false;
  const listeners = new Set<() => void>();
  const notify = () => {
    listeners.forEach((listener) => listener());
  };
  const finish = (value: string | null) => {
    date = value;
    ready = true;
    notify();
  };
  try {
    void AsyncStorage.getItem(TODAY_PULSE_KEY)
      .then((value) => finish(value))
      .catch(() => finish(date));
  } catch {
    ready = true;
  }
  const api: TodayPulseApi = {
    seen: (todayAd) => date === todayAd,
    mark: (todayAd) => {
      date = todayAd;
      ready = true;
      try {
        void AsyncStorage.setItem(TODAY_PULSE_KEY, todayAd).catch(() => {});
      } catch {
        /* storage is optional; the module variable still remembers this session */
      }
    },
    subscribe: (listener) => {
      if (ready) listener();
      else listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  try {
    (globalThis as { __vpTodayPulseApi?: TodayPulseApi }).__vpTodayPulseApi = api;
  } catch {
    /* ignore */
  }
  return api;
}

export const todayPulse = installTodayPulse();

export function todayPulseApi(): TodayPulseApi | null {
  try {
    return (globalThis as { __vpTodayPulseApi?: TodayPulseApi }).__vpTodayPulseApi ?? null;
  } catch {
    return null;
  }
}

type DatedDay = { date_ad: string; outsideMonth?: boolean };

/** Stable across festival enrichment; changes when the visible month changes. */
export function monthSignature(days: DatedDay[]): string {
  const inside = days.filter((day) => !day.outsideMonth);
  const span = inside.length ? inside : days;
  if (!span.length) return "";
  return `${span[0].date_ad}:${span[span.length - 1].date_ad}:${span.length}`;
}

type Travel<T> = {
  sig: string;
  from: T[] | null;
  /** Month the fade was heading toward, frozen while that fade reverses. */
  to: T[] | null;
  dir: number;
  fresh: boolean;
  reverse: boolean;
  token: number;
};

/**
 * Crossfade plus an 8px shift. A tap mid-flight retargets from the current
 * progress instead of restarting, and a tap back to the month still on screen
 * reverses that progress.
 */
export function useMonthTravel<T extends DatedDay>(days: T[]) {
  const reduced = useReducedMotionPref();
  const signature = monthSignature(days);
  const daysRef = useRef(days);
  const [travel, setTravel] = useState<Travel<T>>({
    sig: signature,
    from: null,
    to: null,
    dir: 1,
    fresh: false,
    reverse: false,
    token: 0,
  });

  if (signature !== travel.sig && signature !== "" && travel.sig !== "") {
    const nextDir = signature > travel.sig ? 1 : -1;
    const inFlight = travel.from !== null;
    const fromSig = travel.from ? monthSignature(travel.from) : "";
    if (!inFlight) {
      setTravel({
        sig: signature,
        from: daysRef.current,
        to: null,
        dir: nextDir,
        fresh: true,
        reverse: false,
        token: travel.token + 1,
      });
    } else if (fromSig === signature) {
      setTravel({
        sig: signature,
        from: travel.from,
        to: travel.to ?? daysRef.current,
        dir: travel.dir,
        fresh: false,
        reverse: true,
        token: travel.token + 1,
      });
    } else {
      setTravel({
        sig: signature,
        from: travel.from,
        to: null,
        dir: travel.dir,
        fresh: false,
        reverse: false,
        token: travel.token + 1,
      });
    }
  } else {
    daysRef.current = days;
  }

  const progress = useSharedValue(1);
  const dirSv = useSharedValue(1);
  const reducedSv = useSharedValue(Boolean(reduced));
  const tokenRef = useRef(travel.token);
  const travelRef = useRef(travel);
  tokenRef.current = travel.token;
  travelRef.current = travel;

  useLayoutEffect(() => {
    reducedSv.set(Boolean(reduced));
  }, [reduced, reducedSv]);

  useLayoutEffect(() => {
    const current = travelRef.current;
    if (!current.from) return;
    if (current.fresh) {
      progress.set(0);
      dirSv.set(current.dir);
    }
    const token = current.token;
    const reverse = current.reverse;
    progress.set(withTiming(reverse ? 0 : 1, { duration: DURATION.standard, easing: EASE_OUT }));
    const timer = setTimeout(() => {
      if (tokenRef.current !== token) return;
      setTravel((latest) =>
        latest.token === token ? { ...latest, from: null, to: null, fresh: false, reverse: false } : latest,
      );
    }, DURATION.standard + 40);
    return () => clearTimeout(timer);
  }, [travel.token, progress, dirSv]);

  const incomingStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const shift = reducedSv.get() ? 0 : dirSv.get() * SHIFT;
    return { opacity: p, transform: [{ translateX: (1 - p) * shift }] };
  });
  const outgoingStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const shift = reducedSv.get() ? 0 : dirSv.get() * SHIFT;
    return { opacity: 1 - p, transform: [{ translateX: -p * shift }] };
  });

  return { from: travel.from, to: travel.to, incomingStyle, outgoingStyle };
}

export const CALENDAR_COLS = 7;
export const CALENDAR_GRID_GAP = 1;

export function calendarColumnWidth(containerWidth: number): number {
  if (containerWidth <= 0) return 0;
  return (containerWidth - CALENDAR_GRID_GAP * (CALENDAR_COLS - 1)) / CALENDAR_COLS;
}

/** Measure grid width once — header and body cells share the same column width. */
export function useCalendarGridWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const colWidth = calendarColumnWidth(width);
  return { onLayout, colWidth, ready: colWidth > 0 };
}

export function calendarColStyle(colWidth: number, extra?: ViewStyle): ViewStyle {
  if (colWidth <= 0) {
    return { flex: 1, flexBasis: 0, minWidth: 0, ...extra };
  }
  return { width: colWidth, maxWidth: colWidth, minWidth: 0, ...extra };
}

/** Inset selection ring — avoids border changing column width. */
export function selectionRingStyle(color: string): ViewStyle {
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: color,
    pointerEvents: "none",
  };
}
