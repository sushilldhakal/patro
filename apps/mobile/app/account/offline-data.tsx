import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { InnerPage, SettingsCard } from "@/components/account/AccountList";
import { cn } from "@vedic-patro/design-tokens/cn";
import { SKY_BUILT_IN_END_YEAR, SKY_BUILT_IN_START_YEAR } from "@/lib/bs-range";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { requestLocationPicker } from "@/lib/menu-request";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { OFFLINE_STORE_SUPPORTED } from "@/lib/offline/offline-db";
import { GROUP_APPROX_BYTES, PACK_GROUPS, documentApproxBytes, type PackGroupId } from "@/lib/offline/offline-pack";
import { fetchDocuments } from "@/lib/documents/api";
import type { DocumentSummary } from "@vedic-patro/api-client";

import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { formatByteSize } from "@vedic-patro/features/common";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

/** Copy keys for each download group (`offline.group.<id>.name` / `.hint`). */
const groupName = (id: PackGroupId) => `offline.group.${id}.name`;
const groupHint = (id: PackGroupId) => `offline.group.${id}.hint`;

export default function OfflineDataScreen() {
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const { location } = usePanchangaLocation();
  const {
    isOnline,
    summary,
    progress,
    unfinished,
    wifiOnly,
    setWifiOnly,
    selectionFor,
    startDownload,
    resumeDownload,
    cancelDownload,
    clearOfflineData,
  } = useOfflineData();

  // The offline range is fixed: BS 1950-2150, the years the app works out on the phone.
  const startYear: number = SKY_BUILT_IN_START_YEAR;
  const endYear: number = SKY_BUILT_IN_END_YEAR;
  const { lang } = useLocale();
  const [groups, setGroups] = useState<PackGroupId[]>(["calendar", "sait", "kundali", "cities"]);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [chosenDocs, setChosenDocs] = useState<string[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [busy, setBusy] = useState<"idle" | "downloading" | "clearing">("idle");
  useEffect(() => {
    void fetchDocuments().then((r) => setDocs(r.documents)).catch(() => {});
  }, []);
  const docsBytes = docs.filter((d) => chosenDocs.includes(d.slug)).reduce((n, d) => n + documentApproxBytes(d), 0);
  const totalBytes = groups.reduce((n, g) => n + (GROUP_APPROX_BYTES[g] ?? 0), 0) + docsBytes;
  const [failure, setFailure] = useState<string | null>(null);
  const rangeProblem: string | null = null;

  const valid = rangeProblem == null && startYear != null && endYear != null;

  const toggleGroup = (id: PackGroupId) => {
    if (PACK_GROUPS.find((g) => g.id === id)?.required) return;
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const orderedGroups = PACK_GROUPS.map((g) => g.id).filter((id) => groups.includes(id) || (id === "documents" && chosenDocs.length > 0));

  const onDownload = async () => {
    if (!valid || totalBytes === 0) return;
    setFailure(null);
    setBusy("downloading");
    try {
      const result = await startDownload(selectionFor(startYear!, endYear!, orderedGroups, chosenDocs));
      if (result.status === "error") setFailure(result.error);
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
            } finally {
              setBusy("idle");
            }
          },
        },
      ],
    );
  };

  const running = progress.status === "running" || busy === "downloading";

  if (!OFFLINE_STORE_SUPPORTED) {
    return (
      <InnerPage title={t("ui.account.offline_data")}>
        <View className={msc.offlineEmpty}>
          <Ionicons name="phone-portrait-outline" size={36} color={colors.mutedForeground} />
          <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.offline_downloads_aren_t_available_on")}
          </Text>
        </View>
      </InnerPage>
    );
  }

  const pct = (f: number) => `${digits(Math.round(Math.min(1, Math.max(0, f)) * 100))}%`;
  const stepLabel =
    (progress.currentYear != null && PACK_GROUPS.find((g) => g.id === progress.currentGroup)?.perYear ? `${digits(progress.currentYear)} · ` : "") +
    (progress.currentGroup ? t(groupName(progress.currentGroup)) : "");

  return (
    <InnerPage title={t("ui.account.offline_data")} subtitle={t("ui.account.pick_the_years_to_keep_on")}>
      {!isOnline ? (
        <View
          style={{ borderColor: withAlpha(illustration.orange50, 0.5), backgroundColor: withAlpha(illustration.orange50, 0.12) }}
          className={msc.offlineBanner}
        >
          <Ionicons name="cloud-offline-outline" size={16} color={colors.primary} />
          <Text className="text-caption flex-1" style={{ color: colors.primary, ...nepaliTextStyle(12) }}>
            {t("ui.account.you_re_offline_downloading_needs_an")}
          </Text>
        </View>
      ) : null}

      {/* The offline range, fixed: what works without internet, for the chosen place. */}
      <SettingsCard
        icon="calendar"
        tint="green"
        title={t("offline.range_title", { start: digits(startYear), end: digits(endYear) })}
        caption={t("offline.range_body")}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="location-outline" size={16} color={colors.secondary} />
          <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
            {location.label}
          </Text>
          <Pressable onPress={requestLocationPicker} disabled={running} accessibilityRole="button" hitSlop={8}>
            <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(14)}>
              {t("offline.place_change")}
            </Text>
          </Pressable>
        </View>
      </SettingsCard>

      {/* Extra years and the texts only the server has. */}
      <SettingsCard
        icon="download"
        tint="orange"
        title={t("offline.extra_title")}
        caption={t("offline.extra_caption_fixed")}
      >

        <View className="gap-1">
          {PACK_GROUPS.filter((g) => !g.perYear && g.id !== "documents").map((g) => {
            const on = groups.includes(g.id);
            return (
              <View key={g.id} className="flex-row items-center gap-3 py-2">
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
                    {t(groupName(g.id))}
                  </Text>
                  <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                    {t(groupHint(g.id))} · ≈{formatByteSize(GROUP_APPROX_BYTES[g.id] ?? 0)}
                  </Text>
                </View>
                <Switch
                  value={on}
                  disabled={g.required || running}
                  onValueChange={() => toggleGroup(g.id)}
                  trackColor={{ true: colors.secondary }}
                  accessibilityLabel={t(groupName(g.id))}
                />
              </View>
            );
          })}

          {/* Scriptures, one by one: all of them are hundreds of MB, so the reader picks. */}
          <Pressable onPress={() => setDocsOpen((o) => !o)} accessibilityRole="button" className={msc.offlinePressRow}>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
                {t(groupName("documents"))}
              </Text>
              <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("offline.docs_chosen", { count: digits(chosenDocs.length), total: digits(docs.length) })}
                {chosenDocs.length ? ` · ≈${formatByteSize(docsBytes)}` : ""}
              </Text>
            </View>
            <Ionicons name={docsOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
          </Pressable>
          {docsOpen ? (
            <View className="gap-0.5 pl-2">
              {docs.map((d) => {
                const on = chosenDocs.includes(d.slug);
                return (
                  <Pressable
                    key={d.slug}
                    disabled={running}
                    onPress={() => setChosenDocs((prev) => (on ? prev.filter((x) => x !== d.slug) : [...prev, d.slug]))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className={msc.offlinePressRow}
                  >
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? colors.secondary : colors.mutedForeground} />
                    <Text className={msc.offlineDocTitle} numberOfLines={1} style={nepaliTextStyle(14)}>
                      {lang === "en" ? d.title_en : d.title_ne}
                    </Text>
                    <Text className="text-caption text-muted-foreground">≈{formatByteSize(documentApproxBytes(d))}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {failure ? (
          <Text className="text-caption text-destructive" style={nepaliTextStyle(12)}>
            {failure}
          </Text>
        ) : null}

        {running ? null : (
          <Pressable disabled={!isOnline || totalBytes === 0} onPress={() => void onDownload()} className={cn(msc.offlinePrimary, totalBytes === 0 && "opacity-50")}>
            <Ionicons name="download-outline" size={18} color={neutral.white} />
            <Text className="text-body font-semibold" style={{ color: neutral.white }}>
              {totalBytes > 0
                ? t("ui.account.ok_download_totalbytes", { totalBytes: `≈${formatByteSize(totalBytes)}` })
                : t("offline.nothing_to_download")}
            </Text>
          </Pressable>
        )}

        {running || progress.status === "paused" || progress.status === "error" ? (
          <View className="gap-2">
            <ProgressBlock
              label={
                progress.status === "error"
                  ? t("ui.account.something_went_wrong")
                  : progress.status === "paused"
                    ? t("ui.account.paused_continues_when_the_connection_is")
                    : `${t("ui.account.downloading")} ${pct(progress.fraction)}`
              }
              detail={`${stepLabel}${progress.bytes > 0 ? ` · ${formatByteSize(progress.bytes)}` : ""}`}
              fraction={progress.fraction}
            />
            {progress.skippedRequests > 0 ? (
              <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("offline.skipped", { count: digits(progress.skippedRequests) })}
              </Text>
            ) : null}
            {running ? (
              <Pressable onPress={cancelDownload} className={msc.offlineGhost}>
                <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
                  {t("vastu.compass.stop")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : progress.status === "done" ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
            <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
              {t("ui.account.download_complete_these_years_now_work")}
            </Text>
          </View>
        ) : null}
      </SettingsCard>

      {/* What is on the phone, and how it downloads. */}
      <SettingsCard icon="phone" tint="blue" title={t("ui.account.currently_on_this_device")}>
        <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
          {summary.years.length > 0
            ? `${digits(summary.minYear!)} – ${digits(summary.maxYear!)} ${t("patro_date.era_bs")} · ${t("ui.account.length_years_bytes_stored", { length: digits(summary.years.length), bytes: formatByteSize(summary.bytes) })}`
            : t("ui.account.nothing_downloaded_yet")}
        </Text>
        {unfinished && !running ? (
          <Pressable onPress={() => void resumeDownload()} disabled={!isOnline} className={msc.offlineGhost}>
            <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
              {t("ui.account.resume_unfinished_download")}
            </Text>
          </Pressable>
        ) : null}
        <View className={msc.offlineSettingRow}>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
              {t("ui.account.download_over_wi_fi_only")}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("ui.account.waits_for_wi_fi_before_downloading")}
            </Text>
          </View>
          <Switch value={wifiOnly} onValueChange={setWifiOnly} trackColor={{ true: colors.secondary }} accessibilityLabel={t("ui.account.download_over_wi_fi_only")} />
        </View>
        <Pressable
          disabled={busy !== "idle" || running || summary.bytes === 0}
          onPress={onClear}
          className={cn(msc.offlineClearRow, summary.bytes === 0 && "opacity-50")}
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
      </SettingsCard>
    </InnerPage>
  );
}

/** A labelled progress bar: what is happening with its percentage, the bar, and the current step. */
function ProgressBlock({ label, detail, fraction }: { label: string; detail: string; fraction: number }) {
  const colors = useThemeColors();
  return (
    <View className="gap-1.5">
      <Text className="text-caption font-medium text-foreground" style={nepaliTextStyle(12)}>
        {label}
      </Text>
      <View className={msc.offlineTrack}>
        <View
          style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`, backgroundColor: colors.secondary }}
          className="h-full rounded-full"
        />
      </View>
      {detail ? (
        <Text className="text-caption text-muted-foreground" numberOfLines={1} style={nepaliTextStyle(12)}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
