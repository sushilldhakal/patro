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

import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

/** Copy keys for each download group (`offline.group.<id>.name` / `.hint`). */
const groupName = (id: PackGroupId) => `offline.group.${id}.name`;
const groupHint = (id: PackGroupId) => `offline.group.${id}.hint`;

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
  const { t, digits } = useLocale();
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
    if (startYear == null || endYear == null) return t("ui.account.enter_both_years");
    if (startYear > endYear) return t("ui.account.the_first_year_must_not_be");
    if (startYear < bounds.startYear || endYear > bounds.endYear)
      return t("offline.range_unavailable", { start: digits(bounds.startYear), end: digits(bounds.endYear) });
    if (endYear - startYear > maxSpan)
      return t("offline.span_too_long", { max: digits(maxSpan) });
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
      t("ui.account.clear_offline_data"),
      t("ui.account.all_downloaded_data_will_be_removed"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("ui.account.clear"),
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
      <AppShell title={t("ui.account.offline_data")}>
        <View className="items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12">
          <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
          <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.offline_downloads_aren_t_available_on")}
          </Text>
        </View>
      </AppShell>
    );
  }

  const est = estimateFresh ? measured!.est : null;

  return (
    <AppShell
      title={t("ui.account.offline_data")}
      subtitle={t("ui.account.pick_the_years_to_keep_on")}
    >
      {!isOnline ? (
        <View
          style={{ borderColor: withAlpha(illustration.orange50, 0.5), backgroundColor: withAlpha(illustration.orange50, 0.12) }}
          className="mb-5 flex-row items-center gap-2.5 rounded-lg border p-3"
        >
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text className="text-caption flex-1" style={{ color: colors.primary, ...nepaliTextStyle(12) }}>
            {t("ui.account.you_re_offline_downloading_needs_an")}
          </Text>
        </View>
      ) : null}

      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {t("ui.account.currently_on_this_device")}
        </Text>
        {summary.years.length > 0 ? (
          <>
            <Text className="text-display mt-1 font-bold text-foreground" style={nepaliTextStyle(24)}>
              {digits(summary.minYear!)} – {digits(summary.maxYear!)}{" "}
              <Text className="text-body font-medium text-muted-foreground" style={nepaliTextStyle(13)}>
                {t("patro_date.era_bs")}
              </Text>
            </Text>
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("ui.account.length_years_bytes_stored", { length: digits(summary.years.length), bytes: formatBytes(summary.bytes) })}
            </Text>
          </>
        ) : (
          <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.nothing_downloaded_yet")}
          </Text>
        )}
        {unfinished && !running ? (
          <Pressable
            onPress={() => void resumeDownload()}
            disabled={!isOnline}
            className="mt-3 self-start rounded-lg border border-border px-3 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
              {t("ui.account.resume_unfinished_download")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-5 rounded-xl border border-border bg-card p-4">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {t("ui.account.which_years_do_you_need")}
        </Text>
        <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
          {t("offline.pick_years_hint", { max: digits(maxSpan) })}
        </Text>
        <View className="mt-3 flex-row gap-3">
          <YearInput label={t("ui.account.from_bs")} value={from} onChange={(v) => { setFrom(v); setMeasured(null); }} invalid={rangeProblem != null} />
          <YearInput label={t("ui.account.to_bs")} value={to} onChange={(v) => { setTo(v); setMeasured(null); }} invalid={rangeProblem != null} />
        </View>
        {rangeProblem ? (
          <Text className="text-caption mt-2 text-destructive" style={nepaliTextStyle(12)}>
            {rangeProblem}
          </Text>
        ) : (
          <Text className="text-caption mt-2 text-muted-foreground" style={nepaliTextStyle(12)}>
            {t("offline.years_selected", { count: digits(endYear! - startYear! + 1) })}
          </Text>
        )}

        <Text className="text-caption mb-1 mt-4 font-semibold text-muted-foreground" style={nepaliTextStyle(12)}>
          {t("ui.account.what_to_include")}
        </Text>
        {PACK_GROUPS.map((g) => {
          const on = groups.includes(g.id);
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
                  {t(groupName(g.id))}
                </Text>
                <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                  {t(groupHint(g.id))}
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
              {t("ui.account.total_to_download")}
            </Text>
            <Text className="text-display font-bold text-foreground" style={nepaliTextStyle(24)}>
              {formatBytes(est.totalBytes)}
            </Text>
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("offline.estimate_note", { years: digits(est.years), sample: digits(est.sampleYear) })}
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
            {running ? <ActivityIndicator size="small" color={neutral.white} /> : <Ionicons name="download-outline" size={18} color={neutral.white} />}
            <Text className="text-body font-semibold" style={{ color: neutral.white }}>
              {t("ui.account.ok_download_totalbytes", { totalBytes: formatBytes(est.totalBytes) })}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={!valid || measuring || running || !isOnline}
            onPress={() => void onMeasure()}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
          >
            {measuring ? <ActivityIndicator size="small" color={neutral.white} /> : <Ionicons name="speedometer-outline" size={18} color={neutral.white} />}
            <Text className="text-body font-semibold" style={{ color: neutral.white }}>
              {measuring
                ? t("ui.account.measuring_size")
                : t("ui.account.check_download_size")}
            </Text>
          </Pressable>
        )}
      </View>

      {running || progress.status === "paused" || progress.status === "error" ? (
        <View className="mt-4 rounded-xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption font-medium text-foreground" style={nepaliTextStyle(12)}>
              {progress.status === "error"
                ? t("ui.account.something_went_wrong")
                : progress.status === "paused"
                  ? t("ui.account.paused_continues_when_the_connection_is")
                  : t("ui.account.downloading")}
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
            {progress.currentGroup ? t(groupName(progress.currentGroup)) : ""}
            {progress.bytes > 0 ? ` · ${formatBytes(progress.bytes)}` : ""}
          </Text>
          {progress.skippedRequests > 0 ? (
            <Text className="text-caption mt-1 text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("offline.skipped", { count: digits(progress.skippedRequests) })}
            </Text>
          ) : null}
          {running ? (
            <Pressable
              onPress={cancelDownload}
              className="mt-3 self-start rounded-lg border border-border px-3 py-2 active:opacity-80"
            >
              <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
                {t("vastu.compass.stop")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : progress.status === "done" ? (
        <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-border bg-card p-4">
          <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
          <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.download_complete_these_years_now_work")}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => setWifiOnly(!wifiOnly)}
        className="mt-5 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
      >
        <View className="flex-1 pr-3">
          <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.download_over_wi_fi_only")}
          </Text>
          <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
            {t("ui.account.waits_for_wi_fi_before_downloading")}
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
            {t("ui.account.clear_offline_data_2")}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}
