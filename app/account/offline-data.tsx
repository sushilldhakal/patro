import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { OFFLINE_STORE_SUPPORTED, type DownloadRangeProgress } from "@/lib/offline/offline-store";
import { clampToSupportedBsRange } from "@/lib/offline/offline-range";

const EXTEND_STEP_YEARS = 10;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export default function OfflineDataScreen() {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const {
    isOnline,
    summary,
    installRange,
    initialDownload,
    wifiOnly,
    setWifiOnly,
    downloadRange,
    clearOfflineData,
  } = useOfflineData();

  const [action, setAction] = useState<"idle" | "extending-back" | "extending-forward" | "clearing">("idle");
  const [progress, setProgress] = useState<DownloadRangeProgress | null>(null);

  const range = summary.minYear != null && summary.maxYear != null
    ? { startYear: summary.minYear, endYear: summary.maxYear }
    : installRange;

  const extend = async (direction: "back" | "forward") => {
    setAction(direction === "back" ? "extending-back" : "extending-forward");
    setProgress(null);
    const next = clampToSupportedBsRange(
      direction === "back"
        ? { startYear: range.startYear - EXTEND_STEP_YEARS, endYear: range.endYear }
        : { startYear: range.startYear, endYear: range.endYear + EXTEND_STEP_YEARS },
    );
    try {
      await downloadRange(next, setProgress);
    } finally {
      setAction("idle");
    }
  };

  const onClear = () => {
    Alert.alert(
      pick("अफलाइन डाटा हटाउने?", "Clear offline data?"),
      pick(
        "डाउनलोड गरिएको सबै पात्रो वर्ष यो यन्त्रबाट हटाइनेछ। तपाईं पुनः डाउनलोड गर्न सक्नुहुन्छ।",
        "All downloaded calendar years will be removed from this device. You can download them again later.",
      ),
      [
        { text: pick("रद्द", "Cancel"), style: "cancel" },
        {
          text: pick("हटाउनुहोस्", "Clear"),
          style: "destructive",
          onPress: async () => {
            setAction("clearing");
            try {
              await clearOfflineData();
            } finally {
              setAction("idle");
            }
          },
        },
      ],
    );
  };

  const busy = action !== "idle" || initialDownload.status === "running";
  const activeProgress = action !== "idle" && action !== "clearing" ? progress : initialDownload.status === "running" ? initialDownload : null;

  if (!OFFLINE_STORE_SUPPORTED) {
    return (
      <AppShell title={pick("अफलाइन डाटा", "Offline Data")}>
        <View className="items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12">
          <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
          <Text className="text-center text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick(
              "अफलाइन डाउनलोड यो प्लेटफर्ममा उपलब्ध छैन। एन्ड्रोइड वा आईओएस एपमा प्रयोग गर्नुहोस्।",
              "Offline downloads aren't available on this platform. Use the Android or iOS app.",
            )}
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={pick("अफलाइन डाटा", "Offline Data")}
      subtitle={pick(
        "इन्टरनेट बिना पात्रो हेर्न वर्षहरू डाउनलोड गर्नुहोस्।",
        "Download years of the calendar so it works without an internet connection.",
      )}
    >
      {!isOnline ? (
        <View
          style={{ borderColor: "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.12)" }}
          className="mb-5 flex-row items-center gap-2.5 rounded-lg border p-3"
        >
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text className="flex-1 text-xs" style={{ color: colors.primary, ...nepaliTextStyle(12) }}>
            {pick("तपाईं अफलाइन हुनुहुन्छ। डाउनलोड गर्न इन्टरनेट चाहिन्छ।", "You're offline. Downloading needs an internet connection.")}
          </Text>
        </View>
      ) : null}

      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {pick("हाल डाउनलोड गरिएको", "Currently downloaded")}
        </Text>
        {summary.count > 0 ? (
          <>
            <Text className="mt-1 text-2xl font-bold text-foreground" style={nepaliTextStyle(24)}>
              {digits(summary.minYear!)} – {digits(summary.maxYear!)}{" "}
              <Text className="text-sm font-medium text-muted-foreground" style={nepaliTextStyle(13)}>
                {pick("वि.सं.", "BS")}
              </Text>
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                `${digits(summary.count)} वर्ष · करिब ${formatBytes(summary.approxBytes)}`,
                `${digits(summary.count)} years · about ${formatBytes(summary.approxBytes)}`,
              )}
            </Text>
          </>
        ) : (
          <Text className="mt-1 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("अझै कुनै वर्ष डाउनलोड गरिएको छैन।", "No years downloaded yet.")}
          </Text>
        )}
      </View>

      {activeProgress ? (
        <View className="mt-4 rounded-xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-foreground" style={nepaliTextStyle(12)}>
              {activeProgress.status === "error"
                ? pick("त्रुटि भयो", "Something went wrong")
                : pick("डाउनलोड हुँदैछ…", "Downloading…")}
            </Text>
            <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
              {digits(activeProgress.completed)}/{digits(activeProgress.total)}
            </Text>
          </View>
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              style={{
                width: `${activeProgress.total > 0 ? Math.round((activeProgress.completed / activeProgress.total) * 100) : 0}%`,
                backgroundColor: colors.secondary,
              }}
              className="h-full rounded-full"
            />
          </View>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <Pressable
          disabled={busy || !isOnline}
          onPress={() => extend("back")}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 active:opacity-80 disabled:opacity-50"
        >
          {action === "extending-back" ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Ionicons name="arrow-back-circle-outline" size={18} color={colors.secondary} />
          )}
          <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(12)}>
            {pick(`${digits(EXTEND_STEP_YEARS)} वर्ष अगाडि थप्नुहोस्`, `Add ${EXTEND_STEP_YEARS} yrs earlier`)}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy || !isOnline}
          onPress={() => extend("forward")}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 active:opacity-80 disabled:opacity-50"
        >
          {action === "extending-forward" ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.secondary} />
          )}
          <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(12)}>
            {pick(`${digits(EXTEND_STEP_YEARS)} वर्ष पछाडि थप्नुहोस्`, `Add ${EXTEND_STEP_YEARS} yrs later`)}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setWifiOnly(!wifiOnly)}
        className="mt-5 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
      >
        <View className="flex-1 pr-3">
          <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
            {pick("वाइफाइमा मात्र डाउनलोड गर्नुहोस्", "Download over Wi-Fi only")}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {pick(
              "मोबाइल डाटा बचत गर्न पृष्ठभूमि डाउनलोड हुँदा वाइफाइको पर्खनुहोस्।",
              "Waits for Wi-Fi before running background downloads, to save mobile data.",
            )}
          </Text>
        </View>
        <View
          style={{ backgroundColor: wifiOnly ? colors.secondary : colors.border }}
          className="h-6 w-11 justify-center rounded-full px-0.5"
        >
          <View
            style={{ transform: [{ translateX: wifiOnly ? 20 : 0 }] }}
            className="h-5 w-5 rounded-full bg-white shadow"
          />
        </View>
      </Pressable>

      <View className="mt-8 border-t border-border pt-5">
        <Pressable
          disabled={busy || summary.count === 0}
          onPress={onClear}
          className="flex-row items-center gap-2 self-start rounded-lg border border-destructive px-4 py-2.5 active:opacity-80 disabled:opacity-50"
        >
          {action === "clearing" ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          )}
          <Text className="text-sm font-semibold text-destructive" style={nepaliTextStyle(14)}>
            {pick("अफलाइन डाटा हटाउनुहोस्", "Clear offline data")}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}
