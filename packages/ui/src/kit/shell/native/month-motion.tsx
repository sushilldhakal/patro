/**
 * Month-grid motion shared by the home panchanga grid (apps/mobile) and the kit's
 * BsCalendarGrid: the interruptible month crossfade, and today's one-time ring.
 * One copy, so a fix to either lands in both grids.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { DURATION, EASE_OUT, ENTER_SCALE, SHIFT, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { TodayPulseStore } from "../contract";

export type { TodayPulseStore };

const TODAY_PULSE_MS = 600;

/**
 * One soft ring on today's cell, the first time that civil date is opened. `store` remembers
 * which date already pulsed (the app backs it with storage); without one, nothing plays.
 */
export function TodayCellPulse({
  todayAd,
  store,
  ringClassName,
}: {
  todayAd: string;
  store?: TodayPulseStore;
  /** The ring's border classes: each grid keeps its own colour. */
  ringClassName: string;
}) {
  const reduced = Boolean(useReducedMotionPref());
  const [on, setOn] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  /* One animated style, nothing plain beside it: a `style={[plain, animated]}` array drops the plain part. */
  const style = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  useEffect(() => {
    if (!store) return;
    let cancel = false;
    const unsubscribe = store.subscribe(() => {
      if (cancel || store.seen(todayAd)) return;
      store.mark(todayAd);
      setOn(true);
    });
    return () => {
      cancel = true;
      unsubscribe();
    };
  }, [store, todayAd]);

  useLayoutEffect(() => {
    if (!on) return;
    opacity.set(0);
    scale.set(reduced ? 1 : ENTER_SCALE);
    opacity.set(
      withSequence(
        withTiming(1, { duration: TODAY_PULSE_MS / 2, easing: EASE_OUT }),
        withTiming(0, { duration: TODAY_PULSE_MS / 2, easing: EASE_OUT }),
      ),
    );
    if (!reduced) scale.set(withTiming(1, { duration: TODAY_PULSE_MS, easing: EASE_OUT }));
    const timer = setTimeout(() => setOn(false), TODAY_PULSE_MS + 40);
    return () => clearTimeout(timer);
  }, [on, opacity, reduced, scale]);

  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={style}>
      <View pointerEvents="none" className={cn("absolute inset-0", ringClassName)} />
    </Animated.View>
  );
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
