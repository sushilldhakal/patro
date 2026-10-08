import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { deviceStore } from "@/lib/device-store";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import type { MonthBrowseEra } from "@/lib/api";

/**
 * Sits above the calendar grid on the home screen. Only meaningful for `era ===
 * "bs"` browsing — that's the only era the bulk offline store (see
 * lib/offline/offline-store.ts) is keyed by, so AD/BC/BBS browsing renders
 * nothing here and just uses the live network fetch as before.
 *
 * Two states:
 *  - online + this BS year not downloaded yet → offer to download it for
 *    offline use, or dismiss and keep viewing it online-only.
 *  - offline + this BS year not downloaded → explain why the calendar can't
 *    load right now, since the generic fetch error would otherwise look like
 *    a bug rather than "no connection".
 */
const PROMPT_DISMISSED_KEY = "device:offline_prompt_dismissed";

export function OfflineDownloadPrompt({ year, era }: { year: number; era: MonthBrowseEra }) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const { isOnline, isYearAvailableOffline, downloadYear } = useOfflineData();
  const [dismissedYears, setDismissedYears] = useState<Set<number>>(new Set());
  // null = still reading the saved choice. "Later" is remembered on this device
  // for good; the Offline tab in the bottom bar stays available.
  const [dismissedForever, setDismissedForever] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void deviceStore.get<boolean>(PROMPT_DISMISSED_KEY).then((v) => {
      if (active) setDismissedForever(Boolean(v));
    });
    return () => {
      active = false;
    };
  }, []);
  const [downloadingYear, setDownloadingYear] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<number | null>(null);

  const relevant = era === "bs";
  const available = useMemo(() => (relevant ? isYearAvailableOffline(year) : true), [relevant, isYearAvailableOffline, year]);

  if (!relevant || available || dismissedYears.has(year) || dismissedForever !== false) return null;

  const dismiss = () => setDismissedYears((prev) => new Set(prev).add(year));
  const later = () => {
    setDismissedForever(true);
    void deviceStore.set(PROMPT_DISMISSED_KEY, true);
  };

  if (!isOnline) {
    return (
      <View
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
        className="flex-row items-start gap-2.5 rounded-xl border px-3 py-2.5"
      >
        <Ionicons name="cloud-offline-outline" size={18} color={colors.mutedForeground} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick(
            "तपाईं अफलाइन हुनुहुन्छ र यो वर्षको पात्रो पहिले डाउनलोड गरिएको छैन। इन्टरनेटमा जोडिनुहोस्, वा अनलाइन हुँदा भविष्यको लागि डाउनलोड गर्नुहोस्।",
            "You're offline and this year's calendar hasn't been downloaded yet. Connect to the internet, or download it in advance next time you're online.",
          )}
        </Text>
        <Pressable onPress={dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }

  const downloading = downloadingYear === year;

  return (
    <View
      style={{ borderColor: colors.border, backgroundColor: colors.card }}
      className="flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5"
    >
      <Ionicons name="download-outline" size={18} color={colors.secondary} />
      <Text className="flex-1 text-xs text-foreground" style={nepaliTextStyle(12)}>
        {pick(
          "यो वर्षको पात्रो अफलाइन प्रयोगको लागि डाउनलोड गर्ने हो?",
          "Download this year's calendar for offline use?",
        )}
      </Text>
      {downloadError === year ? (
        <Text className="text-xs text-destructive" style={nepaliTextStyle(12)}>
          {pick("असफल", "Failed")}
        </Text>
      ) : null}
      {downloading ? (
        <ActivityIndicator size="small" color={colors.secondary} />
      ) : (
        <>
          <Pressable
            onPress={async () => {
              setDownloadingYear(year);
              setDownloadError(null);
              try {
                await downloadYear(year);
              } catch {
                setDownloadError(year);
              } finally {
                setDownloadingYear(null);
              }
            }}
            className="rounded-lg bg-primary px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-primary-foreground" style={nepaliTextStyle(12)}>
              {pick("डाउनलोड", "Download")}
            </Text>
          </Pressable>
          <Pressable onPress={later} hitSlop={8} className="px-1">
            <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick("पछि", "Later")}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
