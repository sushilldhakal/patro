/**
 * A tiny hook runner for tests, so the real hooks (state, render-phase updates,
 * `useSyncExternalStore`, React Query) can be exercised without a DOM or a
 * renderer package. It installs a minimal dispatcher on React's internals and
 * re-runs the hook until render-phase `setState` calls settle, like React does.
 *
 * Effects never run, and nothing re-renders by itself: call `rerender()` after
 * changing something the hook subscribes to (the language, the calendar).
 */
import * as React from "react";

type Slot = { value: unknown; deps?: readonly unknown[] };

const internals = (React as unknown as Record<string, { H: unknown }>)
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE!;

const sameDeps = (a?: readonly unknown[], b?: readonly unknown[]) =>
  a != null && b != null && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function renderHook<T>(
  hook: () => T,
  contextValue: (context: React.Context<unknown>) => unknown = (context) =>
    (context as unknown as { _currentValue: unknown })._currentValue,
) {
  const slots: Slot[] = [];
  let cursor = 0;
  let dirty = false;
  let current!: T;

  const slot = (init: () => Slot): Slot => {
    const i = cursor++;
    slots[i] ??= init();
    return slots[i]!;
  };

  const dispatcher = {
    useState<S>(initial: S | (() => S)) {
      const s = slot(() => ({ value: typeof initial === "function" ? (initial as () => S)() : initial }));
      const set = (next: S | ((prev: S) => S)) => {
        const value = typeof next === "function" ? (next as (prev: S) => S)(s.value as S) : next;
        if (Object.is(value, s.value)) return;
        s.value = value;
        dirty = true;
      };
      return [s.value as S, set];
    },
    useMemo<S>(factory: () => S, deps: readonly unknown[]) {
      const s = slot(() => ({ value: undefined, deps: undefined }));
      if (!sameDeps(s.deps, deps)) {
        s.value = factory();
        s.deps = deps;
      }
      return s.value as S;
    },
    useCallback<F>(fn: F, deps: readonly unknown[]) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useRef<S>(initial: S) {
      return slot(() => ({ value: { current: initial } })).value as { current: S };
    },
    useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
      const s = slot(() => ({ value: initial }));
      return [s.value as S, (action: A) => {
        const value = reducer(s.value as S, action);
        if (!Object.is(value, s.value)) {
          s.value = value;
          dirty = true;
        }
      }];
    },
    useSyncExternalStore<S>(_subscribe: unknown, getSnapshot: () => S) {
      cursor++;
      return getSnapshot();
    },
    useContext: (context: React.Context<unknown>) => contextValue(context),
    useEffect: () => { cursor++; },
    useLayoutEffect: () => { cursor++; },
    useInsertionEffect: () => { cursor++; },
    useImperativeHandle: () => { cursor++; },
    useDebugValue: () => {},
    useId: () => "id",
    useTransition: () => [false, (fn: () => void) => fn()],
    useDeferredValue: <S,>(value: S) => value,
  };

  const rerender = (): T => {
    const previous = internals.H;
    internals.H = dispatcher;
    try {
      for (let pass = 0; pass < 25; pass += 1) {
        cursor = 0;
        dirty = false;
        current = hook();
        if (!dirty) return current;
      }
      throw new Error("hook kept updating state while rendering");
    } finally {
      internals.H = previous;
    }
  };

  rerender();
  return {
    get result() {
      return current;
    },
    rerender,
  };
}
