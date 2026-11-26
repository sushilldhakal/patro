import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { __iconNode as ArrowUpDownNode } from "lucide-react/dist/esm/icons/arrow-up-down";
import { __iconNode as PlusNode } from "lucide-react/dist/esm/icons/plus";
import { __iconNode as Trash2Node } from "lucide-react/dist/esm/icons/trash-2";
import { LucideNative } from "@/components/icons/LucideNative";
import { LargeTitlePage } from "@/components/market/LargeTitlePage";
import { OptionSheet, SearchField } from "@/components/market/MarketParts";
import { WatchQuoteRow, useWatchRows } from "@/components/market/NepseCards";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { removeWatched } from "@/lib/watchlist";

type Sort = "added" | "name" | "gain" | "loss";

/**
 * The whole watchlist: search, sort, an "add" row that opens the market, and every starred scrip,
 * currency and metal. Swipe a row left for the bin, or all the way across to remove it at once.
 */
export default function WatchlistScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const rows = useWatchRows();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("added");
  const [sorting, setSorting] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title) : sort === "gain" ? b.move - a.move : sort === "loss" ? a.move - b.move : 0,
    );
  const sorts: { id: Sort; label: string }[] = [
    { id: "added", label: t("market.sort_added") },
    { id: "name", label: t("market.sort_name") },
    { id: "gain", label: t("market.top_gainers") },
    { id: "loss", label: t("market.top_losers") },
  ];

  return (
    <View className="flex-1">
      <LargeTitlePage title={t("market.watchlist")}>
        <View className="flex-row items-center gap-3">
          <SearchField value={query} onChange={setQuery} placeholder={t("market.watch_search")} />
          <Pressable
            onPress={() => setSorting(true)}
            accessibilityRole="button"
            accessibilityLabel={t("market.sort")}
            className="size-12 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
          >
            <LucideNative node={ArrowUpDownNode} size={22} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>

        <View className="gap-1 rounded-3xl border border-border bg-card p-3">
          <Pressable
            onPress={() => router.push("/market?tab=shares")}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl p-1 active:opacity-70"
          >
            <View className="size-11 items-center justify-center rounded-full bg-muted">
              <LucideNative node={PlusNode} size={24} color={colors.foreground} strokeWidth={2.2} />
            </View>
            <Text className="text-base font-semibold text-foreground">{t("market.watch_add_button")}</Text>
          </Pressable>
          {shown.map((r) => (
            <SwipeableRow
              key={r.entry}
              actionLabel={t("market.watch_remove")}
              icon={Trash2Node}
              fullSwipe
              onAction={() => removeWatched(r.entry)}
            >
              <View className="bg-card px-1">
                <WatchQuoteRow row={r} />
              </View>
            </SwipeableRow>
          ))}
          {!shown.length ? (
            <Text className="px-1 py-4 text-sm text-muted-foreground">
              {t(q ? "market.search_none" : "market.watch_home_empty")}
            </Text>
          ) : null}
        </View>
      </LargeTitlePage>
      <OptionSheet open={sorting} title={t("market.sort")} value={sort} options={sorts} onChange={setSort} onClose={() => setSorting(false)} />
    </View>
  );
}
