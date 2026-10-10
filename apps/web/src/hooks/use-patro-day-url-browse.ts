import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NavigateOptions } from "@tanstack/react-router";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePanchangaClock } from "@/components/panchanga/use-panchanga-mode";
import { useLocale } from "@/i18n/locale";
import {
  civilIsoFromDate,
  formatCivilIsoParts,
  parseCivilIsoToDate,
} from "@/lib/patro-day";
import {
  parsePatroDayUrl,
  patroDayFetchFromApiBsParts,
  patroDayFetchFromApiDateAd,
  patroDayFetchFromResolvedPanchanga,
  patroDayFetchStatesEqual,
  patroDayFetchWithBrowseEraToggle,
  patroDayFetchWithDisplayEra,
  patroDayFetchWithUiLanguage,
  type PatroBrowseCalendarParts,
  type PatroDayFetchState,
  type ResolvedPatroDayFields,
} from "@/lib/patro-day-url";
import type { Era } from "@/lib/era";
import {
  locationSearchFingerprint,
  patroDayBrowseNavigateSearch,
  sameLocationParams,
  sameSearch,
  searchToLocation,
  type LocationSearch,
  type PanchangaSearch,
} from "@/lib/url-state";

type NavigateFn = (opts: NavigateOptions) => void;

function fallbackLanguage(lang: string): "en" | "ne" {
  return lang === "en" ? "en" : "ne";
}

/**
 * Display date for a day that has not resolved yet.
 *
 * `new Date(0)` was the sentinel, and it leaked straight into the UI as
 * "1 January 1970" whenever a day failed to load — then `adToBS` turned that
 * into BS 2026, which the header printed under whatever era the URL asked for
 * ("पू.वि.सं. २०२६"). Today is the honest placeholder: a real day that renders
 * consistently in every era. `dateAd` stays empty either way, so nothing
 * downstream mistakes the placeholder for a resolved answer.
 */
function placeholderDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

function dateAdFromPicker(
  pickerDate: Date | null,
  dayState: PatroDayFetchState,
): string {
  if (pickerDate && pickerDate.getTime() !== 0) {
    return civilIsoFromDate(pickerDate);
  }
  if (dayState.kind === "input" && dayState.inputEra === "ad") {
    return formatCivilIsoParts(dayState.year, dayState.month, dayState.day);
  }
  return "";
}

/** Day browse + URL mirror — identity is JD or inputEra+y/m/d or observer today. */
export function usePatroDayUrlBrowse(
  search: PanchangaSearch & LocationSearch,
  navigate: NavigateFn,
  location: PanchangaLocation,
  setLocation: (loc: PanchangaLocation) => void,
  options?: { mirrorUrl?: boolean },
) {
  const mirrorUrl = options?.mirrorUrl !== false;
  const { lang } = useLocale();
  const language = fallbackLanguage(lang);
  const dayState = useMemo(
    () => parsePatroDayUrl(search as Record<string, unknown>, language),
    [search, language],
  );
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const seenUrlLocationRef = useRef<string | null>(null);

  const replaceDayState = useCallback(
    (next: PatroDayFetchState) => {
      if (!mirrorUrl) return;
      navigate({
        search: patroDayBrowseNavigateSearch(location, next),
        replace: true,
        resetScroll: false,
      });
    },
    [location, navigate, mirrorUrl],
  );

  useEffect(() => {
    if (!mirrorUrl) return;
    const desired = patroDayBrowseNavigateSearch(
      location,
      patroDayFetchWithUiLanguage(dayState, language),
    );
    if (!sameSearch(desired, search)) {
      navigate({ search: desired, replace: true, resetScroll: false });
    }
  }, [location, dayState, search, navigate, mirrorUrl, language]);

  useEffect(() => {
    const fp = locationSearchFingerprint(search);
    const prev = seenUrlLocationRef.current;
    seenUrlLocationRef.current = fp;
    if (prev !== null && fp === prev) return;
    const loc = searchToLocation(search);
    if (loc && !sameLocationParams(loc.params, location.params)) setLocation(loc);
  }, [search, location, setLocation]);

  const setDayState = useCallback(
    (next: PatroDayFetchState) => {
      replaceDayState(next);
    },
    [replaceDayState],
  );

  const setDisplayEra = useCallback(
    (nextEra: Era, calendar?: PatroBrowseCalendarParts) => {
      if (dayState.kind === "today") {
        replaceDayState(patroDayFetchWithDisplayEra(dayState, nextEra));
        return;
      }
      let parts = calendar;
      if (
        !parts &&
        dayState.kind === "input" &&
        (dayState.inputEra === "bs" ||
          dayState.inputEra === "bbs" ||
          dayState.inputEra === "ad" ||
          dayState.inputEra === "bc")
      ) {
        parts = { year: dayState.year, month: dayState.month, day: dayState.day };
      }
      replaceDayState(patroDayFetchWithBrowseEraToggle(dayState, nextEra, parts));
    },
    [dayState, replaceDayState],
  );

  // Stable identity: callers put this in effect dependency arrays. As an inline
  // arrow it was rebuilt every render, so those effects re-ran every render and
  // never settled.
  const setDateWithParts = useCallback(
    (d: Date, parts?: { year: number; month: number; day: number }) => {
      setPickerDate(d);
      if (parts) {
        setDayState(patroDayFetchFromApiBsParts(parts, dayState.display));
        return;
      }
      setDayState(patroDayFetchFromApiDateAd(civilIsoFromDate(d), dayState.display));
    },
    [dayState.display, setDayState],
  );

  const syncPickerFromDateAd = useCallback((dateAd: string) => {
    try {
      const next = parseCivilIsoToDate(dateAd);
      // Same day → keep the existing object. `parseCivilIsoToDate` builds a new
      // Date every call, and handing React a fresh identity for an unchanged day
      // re-renders every consumer of `date` (and, when this runs from an effect,
      // never settles).
      setPickerDate((prev) =>
        prev && prev.getTime() === next.getTime() ? prev : next,
      );
    } catch {
      /* ignore */
    }
  }, []);

  const syncResolvedPatroDay = useCallback(
    (resolved: ResolvedPatroDayFields) => {
      const next = patroDayFetchFromResolvedPanchanga(dayState.display, resolved);
      if (next && !patroDayFetchStatesEqual(dayState, next)) {
        setDayState(next);
      }
    },
    [dayState, setDayState],
  );

  const date = pickerDate ?? placeholderDate();
  const dateAd =
    dayState.kind === "input" && dayState.inputEra === "ad"
      ? formatCivilIsoParts(dayState.year, dayState.month, dayState.day)
      : dateAdFromPicker(pickerDate, dayState);

  return {
    dayState,
    setDayState,
    syncResolvedPatroDay,
    date,
    setDate: setDateWithParts,
    syncPickerFromDateAd,
    dateAd,
    patroEra: dayState.display.era,
    setDisplayEra,
  } as const;
}

/** Panchanga day browse + `time` mirror. */
export function usePatroPanchangaUrlBrowse(
  search: PanchangaSearch & LocationSearch,
  navigate: NavigateFn,
  location: PanchangaLocation,
  setLocation: (loc: PanchangaLocation) => void,
) {
  const { lang } = useLocale();
  const language = fallbackLanguage(lang);
  const dayState = useMemo(
    () => parsePatroDayUrl(search as Record<string, unknown>, language),
    [search, language],
  );
  const timezone = location.params.timezone ?? "Asia/Kathmandu";
  const { clock, setClock: setClockState } = usePanchangaClock(timezone, { clock: search.time });
  /** Latest clock, including a setClock that has not re-rendered yet — date
   *  jumps must write `?time=` in the same navigate or the URL mirror puts
   *  the old clock (or the old date) back. */
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const setClock = useCallback((next: string) => {
    clockRef.current = next;
    setClockState(next);
  }, [setClockState]);
  /** Last `?time=` this hook has observed — distinguishes an external change from our own echo. */
  const seenUrlTimeRef = useRef(search.time);
  const seenUrlLocationRef = useRef<string | null>(null);
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const lastMirrorFp = useRef<string | null>(null);
  const pendingDayWriteRef = useRef(false);

  const replaceDayState = useCallback(
    (next: PatroDayFetchState) => {
      const desired = {
        ...patroDayBrowseNavigateSearch(location, next),
        time: clockRef.current,
      };
      lastMirrorFp.current = JSON.stringify(desired);
      pendingDayWriteRef.current = true;
      navigate({
        search: desired,
        replace: true,
        resetScroll: false,
      });
    },
    [location, navigate],
  );

  useEffect(() => {
    const desired = {
      ...patroDayBrowseNavigateSearch(
        location,
        patroDayFetchWithUiLanguage(dayState, language),
      ),
      time: clockRef.current,
    };
    const fp = JSON.stringify(desired);
    if (pendingDayWriteRef.current) {
      pendingDayWriteRef.current = false;
      lastMirrorFp.current = fp;
      // `setClock` + `setDate` in one click: dayState is still the previous
      // URL this frame. Writing that + the new clock would undo the jump.
      return;
    }
    if (lastMirrorFp.current === fp) return;
    if (sameSearch(desired, search)) {
      lastMirrorFp.current = fp;
      return;
    }
    lastMirrorFp.current = fp;
    navigate({ search: desired, replace: true, resetScroll: false });
  }, [location, dayState, clock, search, navigate, language]);

  useEffect(() => {
    // `clock` and `search.time` mirror each other, so exactly one of them has to
    // win when they disagree. The effect above owns clock → URL; this one adopts
    // URL → clock *only* when the URL's time changed on its own (a shared link,
    // back/forward), never when it is simply the echo of what we just wrote.
    //
    // Comparing against `clock` instead is what caused an infinite loop: both
    // effects run in the same commit and each read the other's pre-update value,
    // so a single disagreement made them swap the two times forever ("Maximum
    // update depth exceeded" on every panchanga day URL).
    const urlTime = search.time;
    const changedExternally = urlTime !== seenUrlTimeRef.current;
    seenUrlTimeRef.current = urlTime;
    if (changedExternally && urlTime && urlTime !== clock) {
      setClock(urlTime);
    }
    const locFp = locationSearchFingerprint(search);
    const prevLoc = seenUrlLocationRef.current;
    seenUrlLocationRef.current = locFp;
    if (prevLoc === null || locFp !== prevLoc) {
      const loc = searchToLocation(search);
      if (loc && !sameLocationParams(loc.params, location.params)) setLocation(loc);
    }
  }, [search, clock, setClock, location, setLocation]);

  const syncResolvedPatroDay = useCallback(
    (resolved: ResolvedPatroDayFields) => {
      const next = patroDayFetchFromResolvedPanchanga(dayState.display, resolved);
      if (next && !patroDayFetchStatesEqual(dayState, next)) {
        replaceDayState(next);
      }
    },
    [dayState, replaceDayState],
  );

  const setDateWithParts = useCallback(
    (d: Date, parts?: { year: number; month: number; day: number }) => {
      setPickerDate(d);
      if (parts) {
        replaceDayState(patroDayFetchFromApiBsParts(parts, dayState.display));
        return;
      }
      replaceDayState(patroDayFetchFromApiDateAd(civilIsoFromDate(d), dayState.display));
    },
    [dayState.display, replaceDayState],
  );

  const syncPickerFromDateAd = useCallback((dateAd: string) => {
    try {
      const next = parseCivilIsoToDate(dateAd);
      // See the note in usePatroDayUrlBrowse: an unchanged day must keep its
      // existing Date object or every render re-triggers the caller's effect.
      setPickerDate((prev) =>
        prev && prev.getTime() === next.getTime() ? prev : next,
      );
    } catch {
      /* ignore */
    }
  }, []);

  const setDisplayEra = useCallback(
    (nextEra: Era, calendar?: PatroBrowseCalendarParts) => {
      if (dayState.kind === "today") {
        replaceDayState(patroDayFetchWithDisplayEra(dayState, nextEra));
        return;
      }
      let parts = calendar;
      if (
        !parts &&
        dayState.kind === "input" &&
        (dayState.inputEra === "bs" ||
          dayState.inputEra === "bbs" ||
          dayState.inputEra === "ad" ||
          dayState.inputEra === "bc")
      ) {
        parts = { year: dayState.year, month: dayState.month, day: dayState.day };
      }
      replaceDayState(patroDayFetchWithBrowseEraToggle(dayState, nextEra, parts));
    },
    [dayState, replaceDayState],
  );

  return {
    dayState,
    replaceDayState,
    syncResolvedPatroDay,
    date: pickerDate ?? placeholderDate(),
    setDate: setDateWithParts,
    syncPickerFromDateAd,
    dateAd: dateAdFromPicker(pickerDate, dayState),
    patroEra: dayState.display.era,
    setDisplayEra,
    clock,
    setClock,
  } as const;
}
