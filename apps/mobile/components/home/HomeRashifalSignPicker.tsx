import { useCallback, useRef } from "react";
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
import { useHomeRashifalSignPicker } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/domain/utils";
import type { RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import { rashifalToneBar, rashifalToneText } from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { useBreakpoint } from "@/lib/responsive";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

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
  const picker = useHomeRashifalSignPicker(signs, defaultSignId);
  const { selectIndex, selectedIndex: index } = picker;
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const { isTablet } = useBreakpoint();
  const listRef = useRef<FlatList<RashifalSignBlock>>(null);


  const carouselOuter = width - contentInset * 2;
  const slideWidth = isTablet && width >= 900 ? Math.min(carouselOuter * 0.55, 440) : carouselOuter - 72;

  const goToIndex = useCallback(
    (i: number) => {
      const next = ((i % signs.length) + signs.length) % signs.length;
      selectIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [signs.length, selectIndex],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
      if (i >= 0 && i < signs.length) selectIndex(i);
    },
    [slideWidth, signs.length, selectIndex],
  );

  if (!signs.length) return null;

  const thumbGrid = (
    <View className={homeClasses.pickerGrid}>
      <View className="flex-row flex-wrap gap-2.5">
        {picker.thumbs.map((sign) => {
          const { active } = sign;
          return (
            <Pressable
              key={sign.id}
              onPress={() => goToIndex(sign.index)}
              className={cn(
                homeClasses.pickerThumb,
                active ? homeClasses.pickerThumbActive : homeClasses.pickerThumbIdle,
              )}
              style={{ width: "31%" }}
            >
              <View className="items-center">
                <RashiGlyphIcon name={sign.glyphName} number={sign.id} size={32} />
              </View>
              <Text
                className={cn(homeClasses.pickerName, active ? homeClasses.pickerNameActive : homeClasses.pickerNameIdle)}
                numberOfLines={1}
              >
                {sign.name}
              </Text>
              <View className={homeClasses.pickerBarRow}>
                <View className={homeClasses.pickerBar}>
                  <View
                    className={cn(homeClasses.pickerBarFill, rashifalToneBar(sign.tone))}
                    style={{ width: `${sign.percent}%` }}
                  />
                </View>
                <Text className={cn(homeClasses.pickerPercent, rashifalToneText(sign.tone))}>
                  {sign.percentLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const carousel = (
    <View className={homeClasses.pickerCarousel}>
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
        className={cn(homeClasses.pickerArrow, "absolute left-0 top-[45%] items-center justify-center rounded-full active:opacity-80")}
        accessibilityLabel={picker.copy.prev}
      >
        <Ionicons name="chevron-back" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable
        onPress={() => goToIndex(index + 1)}
        className={cn(homeClasses.pickerArrow, "absolute right-0 top-[45%] items-center justify-center rounded-full active:opacity-80")}
        accessibilityLabel={picker.copy.next}
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
