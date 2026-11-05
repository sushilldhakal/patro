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
  const feed = useQuery({ queryKey: KEY, queryFn: fetchCalendarFeed, enabled, staleTime: Infinity });
  const reset = useMutation({
    mutationFn: resetCalendarFeed,
    onSuccess: (next: CalendarFeed) => queryClient.setQueryData(KEY, next),
  });
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

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
    },
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
