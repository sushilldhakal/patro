import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { maxOfflineSpanYears } from "@/lib/patro-browse-years";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { OFFLINE_STORE_SUPPORTED } from "@/lib/offline/offline-db";
import { clampToSupportedBsRange } from "@/lib/offline/offline-range";
import { PACK_GROUPS, type PackGroupId, type PackSizeEstimate } from "@/lib/offline/offline-pack";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

const GROUP_LABELS: Record<PackGroupId, { ne: string; en: string; hintNe: string; hintEn: string }> = {
  calendar: {
    ne: "पात्रो, चाडपर्व र साइत",
    en: "Calendar, festivals & sait",
    hintNe: "महिनाको पात्रो, बिदा, चाडपर्व, साइत, अधिक मास",
    hintEn: "Month calendar, holidays, festivals, sait, special months",
  },
  sky: {
    ne: "ग्रह, ग्रहण र समय तालिका",
    en: "Planets, eclipses & timings",
    hintNe: "गोचर, अस्त/वक्री, ग्रहण, पञ्चक, सूर्य समय, तिथि/नक्षत्र अवधि",
    hintEn: "Gochar, asta/vakri, eclipses, panchak, sun times, tithi/nakshatra spans",
  },
  daily: {
    ne: "दैनिक विवरण",
    en: "Daily detail",
    hintNe: "हरेक दिनको पञ्चाङ्ग, मुहूर्त, गोचर र राशिफल (धेरै ठूलो हुन सक्छ)",
    hintEn: "Every day's panchanga, muhurta, gochar and rashifal (can be very large)",
  },
  documents: {
    ne: "स्तोत्र र शास्त्र पाठ",
    en: "Scripture texts",
    hintNe: "सबै पाठ (अडियो समावेश छैन)",
    hintEn: "All texts (audio is not included)",
  },
};

function parseYear(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

function YearInput({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-1">
      <Text className="text-caption mb-1 font-semibold text-muted-foreground" style={nepaliTextStyle(12)}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 5))}
        keyboardType="number-pad"
        maxLength={5}
        style={{
          borderColor: invalid ? colors.destructive : colors.border,
          color: colors.foreground,
          backgroundColor: colors.card,
        }}
        className="text-body rounded-lg border px-3 py-2.5"
      />
    </View>
  );
}

export default function OfflineDataScreen() {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const {
    isOnline,
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
    clearOfflineData,
  } = useOfflineData();

  const maxSpan = maxOfflineSpanYears();
  const nowBs = useMemo(() => getCurrentBs().year, []);
  const [from, setFrom] = useState(String(summary.minYear ?? nowBs - 5));
  const [to, setTo] = useState(String(summary.maxYear ?? nowBs + 25));
  const [groups, setGroups] = useState<PackGroupId[]>(["calendar", "sky"]);
  const [measured, setMeasured] = useState<{ key: string; est: PackSizeEstimate } | null>(null);
  const [busy, setBusy] = useState<"idle" | "measuring" | "downloading" | "clearing">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const seeded = useRef(false);

  // Start the pickers from what is already on the device, once it is known.
  useEffect(() => {
    if (seeded.current || summary.minYear == null || summary.maxYear == null) return;
    seeded.current = true;
    setFrom(String(summary.minYear));
    setTo(String(summary.maxYear));
  }, [summary.minYear, summary.maxYear]);

  const startYear = parseYear(from);
  const endYear = parseYear(to);
  const bounds = clampToSupportedBsRange({ startYear: 1, endYear: 99999 });
  const rangeProblem: string | null = (() => {
    if (startYear == null || endYear == null) return pick("दुवै वर्ष लेख्नुहोस्।", "Enter both years.");
    if (startYear > endYear) return pick("सुरु वर्ष अन्तिम वर्षभन्दा पहिले हुनुपर्छ।", "The first year must not be after the last.");
    if (startYear < bounds.startYear || endYear > bounds.endYear)
      return pick(
        `वि.सं. ${digits(bounds.startYear)} देखि ${digits(bounds.endYear)} सम्म मात्र उपलब्ध छ।`,
        `Only BS ${bounds.startYear}–${bounds.endYear} is available.`,
      );
    if (endYear - startYear > maxSpan)
      return pick(
        `बढीमा ${digits(maxSpan)} वर्षको अन्तर मात्र डाउनलोड गर्न सकिन्छ।`,
        `You can download at most a ${maxSpan}-year span.`,
      );
    return null;
  })();

  const valid = rangeProblem == null && startYear != null && endYear != null;
  const selectionKey = valid ? `${startYear}-${endYear}:${[...groups].sort().join(",")}` : "";
  const estimateFresh = measured != null && measured.key === selectionKey;

  const toggleGroup = (id: PackGroupId) => {
    if (PACK_GROUPS.find((g) => g.id === id)?.required) return;
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const orderedGroups = PACK_GROUPS.map((g) => g.id).filter((id) => groups.includes(id));

  const onMeasure = async () => {
    if (!valid) return;
    setFailure(null);
    setBusy("measuring");
    try {
      const est = await estimate(selectionFor(startYear!, endYear!, orderedGroups));
      setMeasured({ key: selectionKey, est });
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("idle");
    }
  };

  const onDownload = async () => {
    if (!valid || !estimateFresh) return;
    setFailure(null);
    setBusy("downloading");
    try {
      const result = await startDownload(selectionFor(startYear!, endYear!, orderedGroups));
      if (result.status === "error") setFailure(result.error);
      if (result.status === "done") setMeasured(null);
    } finally {
      setBusy("idle");
    }
  };

  const onClear = () => {
    Alert.alert(
      pick("अफलाइन डाटा हटाउने?", "Clear offline data?"),
      pick(
        "डाउनलोड गरिएको सबै डाटा यो यन्त्रबाट हटाइनेछ। तपाईं पुनः डाउनलोड गर्न सक्नुहुन्छ।",
        "All downloaded data will be removed from this device. You can download it again later.",
      ),
      [
        { text: pick("रद्द", "Cancel"), style: "cancel" },
        {
          text: pick("हटाउनुहोस्", "Clear"),
          style: "destructive",
          onPress: async () => {
            setBusy("clearing");
            try {
              await clearOfflineData();
              setMeasured(null);
            } finally {
              setBusy("idle");
            }
          },
        },
      ],
    );
  };

  const running = progress.status === "running" || busy === "downloading";
  const measuring = progress.status === "measuring" || busy === "measuring";

  if (!OFFLINE_STORE_SUPPORTED) {
    return (
      <AppShell title={pick("अफलाइन डाटा", "Offline Data")}>
        <View className="items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12">
          <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
          <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick(
              "अफलाइन डाउनलोड यो प्लेटफर्ममा उपलब्ध छैन। एन्ड्रोइड वा आईओएस एपमा प्रयोग गर्नुहोस्।",
              "Offline downloads aren't available on this platform. Use the Android or iOS app.",
            )}
          </Text>
        </View>
      </AppShell>
    );
  }

  const est = estimateFresh ? measured!.est : null;

  return (
    <AppShell
      title={pick("अफलाइन डाटा", "Offline Data")}
      subtitle={pick(
        "इन्टरनेट बिना सबै सार्वजनिक पेजहरू चलाउन वर्षहरू छान्नुहोस्।",
        "Pick the years to keep on this device so every public page works without internet.",
      )}
    >
      {!isOnline ? (
        <View
          style={{ borderColor: "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.12)" }}
          className="mb-5 flex-row items-center gap-2.5 rounded-lg border p-3"
        >
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text className="text-caption flex-1" style={{ color: colors.primary, ...nepaliTextStyle(12) }}>
            {pick("तपाईं अफलाइन हुनुहुन्छ। डाउनलोड गर्न इन्टरनेट चाहिन्छ।", "You're offline. Downloading needs an internet connection.")}
          </Text>
        </View>
      ) : null}

      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {pick("हाल यो यन्त्रमा", "Currently on this device")}
        </Text>
        {summary.years.length > 0 ? (
          <>
            <Text className="text-display mt-1 font-bold text-foreground" style={nepaliTextStyle(24)}>
              {digits(summary.minYear!)} – {digits(summary.maxYear!)}{" "}
              <Text className="text-body font-medium text-muted-foreground" style={nepaliTextStyle(13)}>
                {pick("वि.सं.", "BS")}
              </Text>
            </Text>
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                `${digits(summary.years.length)} वर्ष · ${formatBytes(summary.bytes)} भण्डारण`,
                `${digits(summary.years.length)} years · ${formatBytes(summary.bytes)} stored`,
              )}
            </Text>
          </>
        ) : (
          <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("अझै केही डाउनलोड गरिएको छैन।", "Nothing downloaded yet.")}
          </Text>
        )}
        {unfinished && !running ? (
          <Pressable
            onPress={() => void resumeDownload()}
            disabled={!isOnline}
            className="mt-3 self-start rounded-lg border border-border px-3 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
              {pick("अधुरो डाउनलोड जारी राख्नुहोस्", "Resume unfinished download")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-5 rounded-xl border border-border bg-card p-4">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {pick("कुन वर्षदेखि कुन वर्षसम्म?", "Which years do you need?")}
        </Text>
        <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick(
            `वि.सं. मा वर्ष छान्नुहोस्। बढीमा ${digits(maxSpan)} वर्षको अन्तर (जस्तै २००० देखि २०९० सम्म)।`,
            `Choose BS years. At most a ${maxSpan}-year span (for example 2000 to 2090).`,
          )}
        </Text>
        <View className="mt-3 flex-row gap-3">
          <YearInput label={pick("देखि (वि.सं.)", "From (BS)")} value={from} onChange={(v) => { setFrom(v); setMeasured(null); }} invalid={rangeProblem != null} />
          <YearInput label={pick("सम्म (वि.सं.)", "To (BS)")} value={to} onChange={(v) => { setTo(v); setMeasured(null); }} invalid={rangeProblem != null} />
        </View>
        {rangeProblem ? (
          <Text className="text-caption mt-2 text-destructive" style={nepaliTextStyle(12)}>
            {rangeProblem}
          </Text>
        ) : (
          <Text className="text-caption mt-2 text-muted-foreground" style={nepaliTextStyle(12)}>
            {pick(
              `${digits(endYear! - startYear! + 1)} वर्ष छानिएको छ।`,
              `${endYear! - startYear! + 1} years selected.`,
            )}
          </Text>
        )}

        <Text className="text-caption mb-1 mt-4 font-semibold text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick("के-के डाउनलोड गर्ने?", "What to include")}
        </Text>
        {PACK_GROUPS.map((g) => {
          const on = groups.includes(g.id);
          const label = GROUP_LABELS[g.id];
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                toggleGroup(g.id);
                setMeasured(null);
              }}
              disabled={g.required || running}
              className="flex-row items-start gap-3 py-2 active:opacity-80"
            >
              <Ionicons
                name={on ? "checkbox" : "square-outline"}
                size={20}
                color={on ? colors.secondary : colors.mutedForeground}
              />
              <View className="flex-1">
                <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
                  {pick(label.ne, label.en)}
                </Text>
                <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                  {pick(label.hintNe, label.hintEn)}
                </Text>
              </View>
              {est?.perGroup[g.id] ? (
                <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
                  {formatBytes(est.perGroup[g.id]!.bytes)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        {est ? (
          <View className="mt-3 rounded-lg border border-border bg-background p-3">
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick("डाउनलोड गर्नुपर्ने कुल डाटा", "Total to download")}
            </Text>
            <Text className="text-display font-bold text-foreground" style={nepaliTextStyle(24)}>
              {formatBytes(est.totalBytes)}
            </Text>
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                `${digits(est.years)} वर्षको लागि। एउटा नमूना वर्ष (${digits(est.sampleYear)}) नापेर अनुमान गरिएको; वास्तविक आकार थोरै फरक पर्न सक्छ।`,
                `For ${est.years} years, estimated from a measured sample year (${est.sampleYear}); the real size can differ a little.`,
              )}
            </Text>
          </View>
        ) : null}

        {failure ? (
          <Text className="text-caption mt-3 text-destructive" style={nepaliTextStyle(12)}>
            {failure}
          </Text>
        ) : null}

        {est ? (
          <Pressable
            disabled={!valid || running || !isOnline}
            onPress={() => void onDownload()}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
          >
            {running ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="download-outline" size={18} color="#ffffff" />}
            <Text className="text-body font-semibold" style={{ color: "#ffffff" }}>
              {pick(`ठीक छ, ${formatBytes(est.totalBytes)} डाउनलोड गर्नुहोस्`, `OK — download ${formatBytes(est.totalBytes)}`)}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={!valid || measuring || running || !isOnline}
            onPress={() => void onMeasure()}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
          >
            {measuring ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="speedometer-outline" size={18} color="#ffffff" />}
            <Text className="text-body font-semibold" style={{ color: "#ffffff" }}>
              {measuring
                ? pick("आकार नापिँदैछ…", "Measuring size…")
                : pick("डाउनलोडको आकार हेर्नुहोस्", "Check download size")}
            </Text>
          </Pressable>
        )}
      </View>

      {running || progress.status === "paused" || progress.status === "error" ? (
        <View className="mt-4 rounded-xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption font-medium text-foreground" style={nepaliTextStyle(12)}>
              {progress.status === "error"
                ? pick("त्रुटि भयो", "Something went wrong")
                : progress.status === "paused"
                  ? pick("रोकिएको छ — इन्टरनेट/वाइफाइ फर्किँदा जारी हुन्छ", "Paused — continues when the connection is back")
                  : pick("डाउनलोड हुँदैछ…", "Downloading…")}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {digits(progress.completed)}/{digits(progress.total)}
            </Text>
          </View>
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              style={{
                width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%`,
                backgroundColor: colors.secondary,
              }}
              className="h-full rounded-full"
            />
          </View>
          <Text className="text-caption mt-2 text-muted-foreground" style={nepaliTextStyle(12)}>
            {progress.currentYear != null ? `${digits(progress.currentYear)} · ` : ""}
            {progress.currentGroup ? pick(GROUP_LABELS[progress.currentGroup].ne, GROUP_LABELS[progress.currentGroup].en) : ""}
            {progress.bytes > 0 ? ` · ${formatBytes(progress.bytes)}` : ""}
          </Text>
          {progress.skippedRequests > 0 ? (
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                `${digits(progress.skippedRequests)} अनुरोध सर्भरले उपलब्ध गराएन र छोडियो।`,
                `${progress.skippedRequests} requests the server couldn't answer were skipped.`,
              )}
            </Text>
          ) : null}
          {running ? (
            <Pressable
              onPress={cancelDownload}
              className="mt-3 self-start rounded-lg border border-border px-3 py-2 active:opacity-80"
            >
              <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
                {pick("रोक्नुहोस्", "Stop")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : progress.status === "done" ? (
        <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-border bg-card p-4">
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
          <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
            {pick("डाउनलोड पूरा भयो। अब इन्टरनेट बिना पनि चल्छ।", "Download complete. These years now work without internet.")}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => setWifiOnly(!wifiOnly)}
        className="mt-5 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
      >
        <View className="flex-1 pr-3">
          <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
            {pick("वाइफाइमा मात्र डाउनलोड गर्नुहोस्", "Download over Wi-Fi only")}
          </Text>
          <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
            {pick(
              "मोबाइल डाटा बचत गर्न डाउनलोडले वाइफाइको पर्खनेछ।",
              "Waits for Wi-Fi before downloading, to save mobile data.",
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
          disabled={busy !== "idle" || running || summary.bytes === 0}
          onPress={onClear}
          className="flex-row items-center gap-2 self-start rounded-lg border border-destructive px-4 py-2.5 active:opacity-80 disabled:opacity-50"
        >
          {busy === "clearing" ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          )}
          <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(14)}>
            {pick("अफलाइन डाटा हटाउनुहोस्", "Clear offline data")}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}
