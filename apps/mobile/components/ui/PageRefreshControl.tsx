import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Pull-to-refresh for a page's ScrollView: dragging down from the top refetches
 * every query the visible screen is using, the habit phone users have for
 * "get me the latest". Pass the result as the ScrollView's `refreshControl`.
 */
export function usePageRefreshControl() {
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.secondary}
      colors={[colors.secondary]}
      progressBackgroundColor={colors.card}
    />
  );
}
