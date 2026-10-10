import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";
import type { RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import { rashifalToneBar, rashifalToneText, toNepaliDigits } from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { useBreakpoint } from "@/lib/responsive";

type Props = {
  signs: RashifalSignBlock[];
  period: RashifalPeriod;
  defaultSignId?: number;
  contentInset?: number;
};

export function HomeRashifalSignPicker({
  signs,
  period,
  defaultSignId,
  contentInset = 0,
}: Props) {
  const { lang, pick } = useLocale();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const { isTablet } = useBreakpoint();
  const listRef = useRef<FlatList<RashifalSignBlock>>(null);

  const initialIndex = Math.max(
    0,
    signs.findIndex((s) => s.id === (defaultSignId ?? signs[0]?.id)),
  );
  const [index, setIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const carouselOuter = width - contentInset * 2;
  const slideWidth = isTablet && width >= 900 ? Math.min(carouselOuter * 0.55, 440) : carouselOuter - 72;

  const goToIndex = useCallback(
    (i: number) => {
      const next = ((i % signs.length) + signs.length) % signs.length;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [signs.length],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
      if (i >= 0 && i < signs.length) setIndex(i);
    },
    [slideWidth, signs.length],
  );

  if (!signs.length) return null;

  const selectedId = signs[index]?.id;

  const thumbGrid = (
    <View className="rounded-xl border border-border bg-card/80 p-2.5">
      <View className="flex-row flex-wrap gap-2.5">
        {signs.map((sign, i) => {
          const name = lang === "ne" ? sign.name : sign.title_en;
          const active = sign.id === selectedId;
          const pct = sign.percent ?? 50;
          return (
            <Pressable
              key={sign.id}
              onPress={() => goToIndex(i)}
              className={cn(
                "min-w-0 flex-col gap-1.5 rounded-lg border px-2 py-2.5",
                active
                  ? "border-secondary bg-secondary/15"
                  : "border-border/50 bg-muted/25",
              )}
              style={{ width: "31%" }}
            >
              <View className="items-center">
                <RashiGlyphIcon name={getRashiName(sign.id, lang)} number={sign.id} size={32} />
              </View>
              <Text className="text-caption text-center font-semibold text-foreground" numberOfLines={1}>
                {name}
              </Text>
              <View className="flex-row items-center gap-0.5 px-0.5">
                <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <View
                    className={cn("h-full rounded-full", rashifalToneBar(sign.tone))}
                    style={{ width: `${pct}%` }}
                  />
                </View>
                <Text className={cn("text-caption shrink-0 font-bold tabular-nums", rashifalToneText(sign.tone))}>
                  {toNepaliDigits(pct, lang)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const carousel = (
    <View className="relative px-9">
      <FlatList
        ref={listRef}
        data={signs}
        keyExtractor={(s) => String(s.id)}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={slideWidth}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 50);
        }}
        renderItem={({ item }) => (
          <View style={{ width: slideWidth }}>
            <RashifalSignCard sign={item} period={period} />
          </View>
        )}
      />
      <Pressable
        onPress={() => goToIndex(index - 1)}
        className="absolute left-0 top-[45%] size-8 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
        accessibilityLabel={pick("अघिल्लो", "Previous")}
      >
        <Ionicons name="chevron-back" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable
        onPress={() => goToIndex(index + 1)}
        className="absolute right-0 top-[45%] size-8 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
        accessibilityLabel={pick("अर्को", "Next")}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );

  if (isTablet && width >= 900) {
    return (
      <View className="flex-row items-start gap-4">
        <View style={{ width: 352 }} className="shrink-0">
          {thumbGrid}
        </View>
        <View className="min-w-0 flex-1">{carousel}</View>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {thumbGrid}
      {carousel}
    </View>
  );
}
