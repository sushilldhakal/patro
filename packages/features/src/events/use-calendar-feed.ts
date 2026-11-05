/**
 * The "In Google or Apple Calendar" card: the signed-in user's private subscription link, its
 * Apple / Google / copy links, and replacing it (two taps: the old link stops working).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarFeedLinks, fetchCalendarFeed, resetCalendarFeed, type CalendarFeed } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

const KEY = ["events", "feed"] as const;

export function useCalendarFeed({ enabled, origin }: { enabled: boolean; origin?: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  // Until a calendar app has fetched the link, ask again every few seconds so "Connected" appears by itself.
  const feed = useQuery({
    queryKey: KEY,
    queryFn: fetchCalendarFeed,
    enabled,
    staleTime: Infinity,
    refetchInterval: (q) => (q.state.data && !q.state.data.synced_at ? 15_000 : false),
    refetchOnWindowFocus: true,
  });
  const reset = useMutation({
    mutationFn: resetCalendarFeed,
    onSuccess: (next: CalendarFeed) => queryClient.setQueryData(KEY, next),
  });
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const syncedApp = feed.data?.synced_app ?? null;
  const syncedAt = feed.data?.synced_at ?? null;

  return {
    copy: {
      title: t("events.feed_title"),
      body: t("events.feed_body"),
      apple: t("events.feed_apple"),
      google: t("events.feed_google"),
      copyLink: t("events.feed_copy"),
      shareLink: t("events.feed_share"),
      copied: t("events.feed_copied"),
      reset: confirming ? t("events.feed_reset_confirm") : t("events.feed_reset"),
      privacy: t("events.feed_private"),
      loading: t("events.feed_loading"),
      failed: t("events.feed_failed"),
      connectedTitle: t("events.feed_connected_title"),
      connectedTo: syncedApp ? t(`events.feed_connected_${syncedApp}`) : "",
      lastSynced: syncedAt ? t("events.feed_last_synced", { time: new Date(syncedAt).toLocaleString() }) : "",
      showLinks: t("events.feed_show_links"),
      hideLinks: t("events.feed_hide_links"),
    },
    /** A calendar app has fetched the link: the subscription worked, so the card shows it as connected. */
    connected: syncedAt != null,
    showLinks: showLinks || syncedAt == null,
    toggleLinks: () => setShowLinks((v) => !v),
    links: feed.data ? calendarFeedLinks(feed.data.path, origin) : null,
    loading: feed.isLoading || reset.isPending,
    failed: feed.isError || reset.isError,
    retry: () => void feed.refetch(),
    copied,
    /** The app calls this after it put the link on the clipboard. */
    markCopied: () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    confirming,
    /** First tap asks, the second makes the new link. */
    reset: () => {
      if (!confirming) {
        setConfirming(true);
        return;
      }
      setConfirming(false);
      reset.mutate();
    },
  };
}

export type CalendarFeedState = ReturnType<typeof useCalendarFeed>;
