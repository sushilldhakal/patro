import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { readJsonMeta, writeJsonMeta } from "@/lib/offline/offline-db";
import { tokenStore } from "@/lib/auth/client";
import { notifStore } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { useNetworkStatus } from "@/lib/offline/network-status";
import { clearOfflineHttp, offlineHttpSummary } from "@/lib/offline/offline-http";
import { clearDownloadedYears, listDownloadedYears } from "@/lib/offline/offline-store";
import {
  clearSavedPacks,
  estimatePackSize,
  readSavedPacks,
  runPackDownload,
  type PackGroupId,
  type PackProgress,
  type PackSelection,
  type PackSizeEstimate,
  type SavedPack,
} from "@/lib/offline/offline-pack";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { locationCacheKey, type LocationParams } from "@/lib/api";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";

const WIFI_ONLY_PREF_KEY = "offline_wifi_only_v1";

const IDLE_PROGRESS: PackProgress = {
  status: "idle",
  completed: 0,
  total: 0,
  currentYear: null,
  currentGroup: null,
  bytes: 0,
  skippedRequests: 0,
  error: null,
};

export interface OfflineSummary {
  /** BS years whose calendar is saved for the current location. */
  years: number[];
  minYear: number | null;
  maxYear: number | null;
  /** Everything saved on the device, all locations. */
  bytes: number;
  requests: number;
  groups: PackGroupId[];
}

const EMPTY_SUMMARY: OfflineSummary = {
  years: [],
  minYear: null,
  maxYear: null,
  bytes: 0,
  requests: 0,
  groups: [],
};

function summarize(pack: SavedPack | undefined, totals: { count: number; bytes: number }): OfflineSummary {
  const years = new Set<number>();
  const groups = new Set<PackGroupId>();
  for (const key of pack?.done ?? []) {
    const [head, group] = key.split(":");
    if (group) groups.add(group as PackGroupId);
    if (group === "calendar" && head !== "once") years.add(Number(head));
  }
  const sorted = [...years].sort((a, b) => a - b);
  return {
    years: sorted,
    minYear: sorted[0] ?? null,
    maxYear: sorted[sorted.length - 1] ?? null,
    bytes: totals.bytes,
    requests: totals.count,
    groups: [...groups],
  };
}

interface OfflineDataContextValue {
  isOnline: boolean;
  isWifi: boolean;
  summary: OfflineSummary;
  /** The pack being measured or downloaded right now, or the last one's result. */
  progress: PackProgress;
  /** A saved pack for this location that was started but not finished. */
  unfinished: SavedPack | null;
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  /** Selection helper: the location the pack will be saved for. */
  selectionFor: (startYear: number, endYear: number, groups: PackGroupId[]) => PackSelection;
  /** Measures a sample so the real download size can be shown before the user agrees. */
  estimate: (selection: PackSelection) => Promise<PackSizeEstimate>;
  /** Downloads the selection. Call only after the user has seen the size and agreed. */
  startDownload: (selection: PackSelection) => Promise<PackProgress>;
  resumeDownload: () => Promise<void>;
  cancelDownload: () => void;
  isYearAvailableOffline: (year: number) => boolean;
  /** One year's calendar group — the "download for offline use" prompt on the home screen. */
  downloadYear: (year: number) => Promise<void>;
  refreshSummary: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineDataContext = createContext<OfflineDataContextValue | null>(null);

/**
 * Owns what is saved for offline use and the download that saves it. Nothing
 * is downloaded unless the user picked a window and agreed to its size
 * (`startDownload`); an interrupted download of that agreed window is
 * resumed on a later launch, never anything else.
 */
export function OfflineDataProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, isWifi } = useNetworkStatus();
  const { location } = usePanchangaLocation();
  const [summary, setSummary] = useState<OfflineSummary>(EMPTY_SUMMARY);
  const [progress, setProgress] = useState<PackProgress>(IDLE_PROGRESS);
  const [unfinished, setUnfinished] = useState<SavedPack | null>(null);
  const [wifiOnly, setWifiOnlyState] = useState(true);

  const runningRef = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;
  const wifiOnlyRef = useRef(wifiOnly);
  wifiOnlyRef.current = wifiOnly;

  const refreshSummary = useCallback(async () => {
    const [packs, totals, legacy] = await Promise.all([
      readSavedPacks(),
      offlineHttpSummary(),
      listDownloadedYears(locationRef.current.params),
    ]);
    const mine = packs[locationCacheKey(locationRef.current.params)];
    const next = summarize(mine, totals);
    if (legacy.years.length > 0) {
      const years = [...new Set([...next.years, ...legacy.years])].sort((a, b) => a - b);
      next.years = years;
      next.minYear = years[0] ?? null;
      next.maxYear = years[years.length - 1] ?? null;
      next.bytes += legacy.approxBytes;
    }
    setSummary(next);
    setUnfinished(mine && !mine.finished ? mine : null);
  }, []);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, location.label]);

  useEffect(() => {
    readJsonMeta<boolean>(WIFI_ONLY_PREF_KEY).then((stored) => {
      if (stored != null) setWifiOnlyState(stored);
    });
  }, []);

  const setWifiOnly = useCallback((value: boolean) => {
    setWifiOnlyState(value);
    void writeJsonMeta(WIFI_ONLY_PREF_KEY, value);
  }, []);

  const selectionFor = useCallback(
    (startYear: number, endYear: number, groups: PackGroupId[]): PackSelection => {
      const params: LocationParams | undefined = locationRef.current.params;
      return { startYear, endYear, groups, location: params, locationKey: locationCacheKey(params) };
    },
    [],
  );

  const estimate = useCallback(async (selection: PackSelection) => {
    setProgress({ ...IDLE_PROGRESS, status: "measuring" });
    try {
      return await estimatePackSize(selection, getCurrentBs().year, setProgress);
    } finally {
      setProgress(IDLE_PROGRESS);
      await refreshSummary();
    }
  }, [refreshSummary]);

  const startDownload = useCallback(
    async (selection: PackSelection) => {
      if (runningRef.current) return progress;
      runningRef.current = true;
      try {
        const result = await runPackDownload(selection, {
          wifiOnly: wifiOnlyRef.current,
          onProgress: setProgress,
          shouldContinue: () => runningRef.current,
        });
        /* A finished pack is the moment to top up the account's daily-guidance
           cache too, so reminders and the briefing keep working offline. */
        if (tokenStore.access || tokenStore.refresh) {
          void notifStore.getLang().then((lang) => syncNotifications({ lang, force: true }));
        }
        return result;
      } finally {
        runningRef.current = false;
        await refreshSummary();
      }
    },
    [progress, refreshSummary],
  );

  const resumeDownload = useCallback(async () => {
    if (!unfinished) return;
    await startDownload({ ...unfinished.selection, location: locationRef.current.params });
  }, [unfinished, startDownload]);

  const cancelDownload = useCallback(() => {
    runningRef.current = false;
  }, []);

  // Picks an agreed-but-unfinished download back up when the connection allows —
  // only ever one the user already confirmed.
  useEffect(() => {
    if (!unfinished || runningRef.current) return;
    if (!isOnline) return;
    if (wifiOnly && !isWifi) return;
    void resumeDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unfinished?.updatedAt, isOnline, isWifi, wifiOnly]);

  useEffect(
    () => () => {
      runningRef.current = false;
    },
    [],
  );

  const yearsSet = useMemo(() => new Set(summary.years), [summary.years]);
  const isYearAvailableOffline = useCallback((year: number) => yearsSet.has(year), [yearsSet]);

  const downloadYear = useCallback(
    async (year: number) => {
      await startDownload(selectionFor(year, year, ["calendar"]));
    },
    [startDownload, selectionFor],
  );

  const clearOfflineData = useCallback(async () => {
    runningRef.current = false;
    await clearOfflineHttp();
    await clearSavedPacks();
    await clearDownloadedYears(locationRef.current.params);
    setProgress(IDLE_PROGRESS);
    await refreshSummary();
  }, [refreshSummary]);

  const value = useMemo<OfflineDataContextValue>(
    () => ({
      isOnline,
      isWifi,
      summary,
      progress,
      unfinished,
      wifiOnly,
      setWifiOnly,
      selectionFor,
      estimate,
      startDownload,
      resumeDownload,
      cancelDownload,
      isYearAvailableOffline,
      downloadYear,
      refreshSummary,
      clearOfflineData,
    }),
    [
      isOnline,
      isWifi,
      summary,
      progress,
      unfinished,
      wifiOnly,
      setWifiOnly,
      selectionFor,
      estimate,
      startDownload,
      resumeDownload,
      cancelDownload,
      isYearAvailableOffline,
      downloadYear,
      refreshSummary,
      clearOfflineData,
    ],
  );

  return <OfflineDataContext.Provider value={value}>{children}</OfflineDataContext.Provider>;
}

export function useOfflineData(): OfflineDataContextValue {
  const ctx = useContext(OfflineDataContext);
  if (!ctx) throw new Error("useOfflineData must be used within OfflineDataProvider");
  return ctx;
}
