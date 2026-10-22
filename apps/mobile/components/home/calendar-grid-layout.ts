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

type Slot = "a" | "b";

type Travel<T> = {
  sig: string;
  a: T[];
  b: T[] | null;
  /** Slot that should finish visible. */
  top: Slot;
  /** Slot fading away, or null once the month has settled. */
  ghost: Slot | null;
  /** +1 next month, −1 previous. Kept on a reversal so the shift returns along the same path. */
  dir: number;
  kind: "idle" | "enter" | "reverse" | "retarget" | "run";
  token: number;
  /** Month asked for while a fade was already running. */
  pending: T[] | null;
};

/**
 * Crossfade plus a SHIFT px slide. A tap mid-flight retargets from the current
 * opacity and translate — the month you can see keeps its place, the faint one
 * is replaced. A tap back to the month still underneath reverses along the same path.
 */
export function useMonthTravel<T extends DatedDay>(days: T[]) {
  const reduced = Boolean(useReducedMotionPref());
  const signature = monthSignature(days);
  const snapshotRef = useRef(days);
  const [travel, setTravel] = useState<Travel<T>>({
    sig: signature,
    a: days,
    b: null,
    top: "a",
    ghost: null,
    dir: 1,
    kind: "idle",
    token: 0,
    pending: null,
  });

  if (signature !== travel.sig) {
    if (signature === "" || travel.sig === "") {
      snapshotRef.current = days;
      setTravel({
        ...travel,
        sig: signature,
        a: days,
        top: "a",
        ghost: null,
        kind: "idle",
        pending: null,
      });
    } else if (travel.ghost) {
      const ghostDays = travel.ghost === "a" ? travel.a : travel.b;
      const ghostSig = ghostDays ? monthSignature(ghostDays) : "";
      if (ghostSig === signature && ghostDays) {
        const top: Slot = travel.ghost;
        setTravel({
          ...travel,
          sig: signature,
          top,
          ghost: travel.top,
          kind: "reverse",
          token: travel.token + 1,
          pending: null,
        });
      } else {
        setTravel({
          ...travel,
          sig: signature,
          dir: signature > travel.sig ? 1 : -1,
          kind: "retarget",
          token: travel.token + 1,
          pending: days,
        });
      }
    } else {
      const previous = snapshotRef.current.slice();
      const incoming: Slot = travel.top === "a" ? "b" : "a";
      setTravel({
        ...travel,
        sig: signature,
        a: incoming === "a" ? days : previous,
        b: incoming === "b" ? days : previous,
        top: incoming,
        ghost: travel.top,
        dir: signature > travel.sig ? 1 : -1,
        kind: "enter",
        token: travel.token + 1,
        pending: null,
      });
    }
  } else {
    snapshotRef.current = days;
  }

  const opA = useSharedValue(1);
  const opB = useSharedValue(0);
  const xA = useSharedValue(0);
  const xB = useSharedValue(0);
  const reducedSv = useSharedValue(reduced);
  const travelRef = useRef(travel);
  const tokenRef = useRef(travel.token);
  const settledToken = useRef(0);
  travelRef.current = travel;
  tokenRef.current = travel.token;

  const settle = useCallback((token: number) => {
    if (tokenRef.current !== token || settledToken.current === token) return;
    const current = travelRef.current;
    if (current.token !== token || current.ghost == null) return;
    settledToken.current = token;
    if (current.ghost === "a") {
      opA.set(0);
      xA.set(0);
    } else {
      opB.set(0);
      xB.set(0);
    }
    const next: Travel<T> = { ...current, ghost: null, kind: "idle", pending: null };
    travelRef.current = next;
    setTravel(next);
  }, [opA, opB, xA, xB]);

  useLayoutEffect(() => {
    reducedSv.set(reduced);
  }, [reduced, reducedSv]);

  useLayoutEffect(() => {
    const current = travelRef.current;
    if (current.kind === "idle" || current.kind === "run") return;
    const token = current.token;
    const shift = reducedSv.get() ? 0 : current.dir * SHIFT;
    const timing = { duration: DURATION.standard, easing: EASE_OUT };
    const op = { a: opA, b: opB };
    const x = { a: xA, b: xB };
    const playIn = (slot: Slot) => {
      op[slot].set(0);
      x[slot].set(shift);
      op[slot].set(withTiming(1, timing));
      x[slot].set(withTiming(0, timing));
    };
    const playOut = (slot: Slot, toX: number) => {
      op[slot].set(withTiming(0, timing));
      x[slot].set(withTiming(toX, timing));
    };

    if (current.kind === "reverse" && current.ghost) {
      playOut(current.ghost, shift === 0 ? 0 : current.dir * SHIFT);
      op[current.top].set(withTiming(1, timing));
      x[current.top].set(withTiming(0, timing));
    } else if (current.kind === "enter" && current.ghost) {
      playIn(current.top);
      playOut(current.ghost, shift === 0 ? 0 : -shift);
    } else if (current.kind === "retarget" && current.ghost && current.pending) {
      const destOp = op[current.top].get();
      const srcOp = op[current.ghost].get();
      const incoming: Slot = destOp >= srcOp ? current.ghost : current.top;
      const outgoing: Slot = incoming === "a" ? "b" : "a";
      const next: Travel<T> = {
        ...current,
        a: incoming === "a" ? current.pending : current.a,
        b: incoming === "b" ? current.pending : current.b,
        top: incoming,
        ghost: outgoing,
        kind: "run",
        pending: null,
      };
      playIn(incoming);
      playOut(outgoing, shift === 0 ? 0 : -shift);
      travelRef.current = next;
      setTravel(next);
    }

    const timer = setTimeout(() => settle(token), DURATION.standard + 80);
    return () => clearTimeout(timer);
  }, [travel.token, opA, opB, xA, xB, reducedSv, settle]);

  const styleA = useAnimatedStyle(() => ({
    opacity: opA.get(),
    transform: [{ translateX: xA.get() }],
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: opB.get(),
    transform: [{ translateX: xB.get() }],
  }));

  const incomingDays = travel.top === "a" ? travel.a : travel.b;
  const outgoingDays = travel.ghost === "a" ? travel.a : travel.ghost === "b" ? travel.b : null;
  const incomingLive = incomingDays && monthSignature(incomingDays) === signature ? days : incomingDays;
  return {
    from: outgoingDays,
    to: travel.ghost ? incomingLive : null,
    incomingStyle: travel.top === "a" ? styleA : styleB,
    outgoingStyle: travel.ghost === "b" ? styleB : styleA,
  };
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
