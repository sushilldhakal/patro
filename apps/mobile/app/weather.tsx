import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  useWeatherPage,
  type WeatherFact,
  type WeatherHourView,
  type WeatherHourlyRow,
  type WeatherPage,
} from "@vedic-patro/features/weather";
import { weatherInk } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { weatherClasses as wc } from "@vedic-patro/design-tokens/classes/weather-classes";
import {
  CSS_EASE_OUT,
  DURATION,
  PRESS_SCALE,
  useReducedMotionPref,
} from "@vedic-patro/ui/motion";
import {
  FactIcon,
  UiIcon,
  UvDot,
  WeatherGlyph,
  WindArrow,
} from "@vedic-patro/ui/kit/weather";
import { Sheet } from "@vedic-patro/ui";
import { Text } from "@/components/ui/Text";
import { locateDevice } from "@/components/panchanga/locate-device";
import { requestLocationPicker } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useTheme } from "@/lib/theme-context";

/** One hourly column, the website's `w-16`. */
const COLUMN = 64;

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), {
  className: "style",
});

/** Buttons scale to 0.97 on press-in (ease-out, the app's fast duration); full-width rows highlight instead. */
function PressScale({
  className,
  children,
  ...rest
}: PressableProps & { className?: string; children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const [pressed, setPressed] = useState(false);
  return (
    <ScalePressable
      {...rest}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      className={className}
      style={{
        transform: [{ scale: !reduced && pressed ? PRESS_SCALE : 1 }],
        transitionProperty: "transform",
        transitionDuration: reduced ? 0 : DURATION.fast,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      {children}
    </ScalePressable>
  );
}

/** A chevron that turns over when its section opens. */
function Chevron({ open }: { open: boolean }) {
  return (
    <Animated.View
      style={{
        transform: [{ rotate: open ? "180deg" : "0deg" }],
        transitionProperty: "transform",
        transitionDuration: 200,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      <UiIcon name="chevron-down" size={20} />
    </Animated.View>
  );
}

function Sky() {
  const { isDark } = useTheme();
  const [top, bottom] = isDark ? weatherInk.sky.dark : weatherInk.sky.light;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="wx-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wx-sky)" />
      </Svg>
    </View>
  );
}

function FactRow({ fact }: { fact: WeatherFact }) {
  return (
    <View className="flex-row items-center gap-2.5">
      {fact.icon ? <FactIcon icon={fact.icon} size={18} /> : null}
      <Text className="flex-1" style={nepaliTextStyle()}>
        <Text className={wc.factValue}>{fact.value}</Text>
        {fact.label ? (
          <Text className={wc.factLabel}> {fact.label}</Text>
        ) : null}
      </Text>
    </View>
  );
}

function Facts({
  title,
  facts,
  wide,
}: {
  title: string;
  facts: WeatherFact[];
  wide: boolean;
}) {
  return (
    <View className={cn(wc.detailBlock, wide && "flex-1 border-b-0")}>
      <Text className={wc.detailTitle} style={nepaliTextStyle()}>
        {title}
      </Text>
      {facts.map((f) => (
        <FactRow key={f.key} fact={f} />
      ))}
    </View>
  );
}

/** The sky: back, place (tap to change), now. Runs under the status bar like a weather app's header. */
function Hero({ page, top }: { page: WeatherPage; top: number }) {
  const router = useRouter();
  const { isTablet } = useBreakpoint();
  const now = page.now;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ paddingTop: top }}>
      <Sky />
      <View className={wc.band}>
        <View className={cn("flex-row", wc.topBar)}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={page.copy.back}
            onPress={back}
            hitSlop={8}
            className="size-11 items-center justify-center"
          >
            <UiIcon name="arrow-left" size={24} tone="foreground" />
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={page.copy.changePlace}
            onPress={requestLocationPicker}
            className={cn("flex-row", wc.placeButton)}
          >
            <UiIcon
              name={page.usingGps ? "arrow" : "map-pin"}
              size={20}
              tone="foreground"
            />
            <Text
              className={cn("shrink", wc.heroPlace)}
              numberOfLines={1}
              style={nepaliTextStyle()}
            >
              {page.placeName}
            </Text>
            <UiIcon name="chevron-down" size={18} tone="foreground" />
          </PressScale>
        </View>

        {now ? (
          <Animated.View
            entering={FadeIn.duration(250)}
            className={wc.heroBody}
          >
            <View className={cn("flex-row", wc.heroTempRow)}>
              <View>
                <Text className={wc.heroTemp}>{now.temperature}</Text>
                <Text className={wc.heroFeels} style={nepaliTextStyle()}>
                  {now.feelsLike}
                </Text>
              </View>
              <WeatherGlyph glyph={now.glyph} size={isTablet ? 104 : 88} />
            </View>
            <View className="flex-row gap-8">
              {now.range.map((r) => (
                <View key={r.key}>
                  <Text className={wc.heroRangeValue}>{r.value}</Text>
                  <Text className={wc.heroRangeLabel} style={nepaliTextStyle()}>
                    {r.label}
                  </Text>
                </View>
              ))}
            </View>
            <View className="gap-2">
              <Text className={wc.heroLine} style={nepaliTextStyle()}>
                {now.rainLine}
              </Text>
              <Text className={wc.heroLine} style={nepaliTextStyle()}>
                {now.glyph.label}
              </Text>
            </View>
          </Animated.View>
        ) : (
          <View className="px-5 pb-10 pt-6">
            <Text
              className={
                page.status === "error" ? "text-base text-danger" : wc.heroFeels
              }
              style={nepaliTextStyle()}
            >
              {page.status === "error"
                ? page.copy.loadError
                : page.copy.loading}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Today({ page }: { page: WeatherPage }) {
  const { isTablet } = useBreakpoint();
  const now = page.now!;
  const { copy } = page;
  return (
    <View className="border-b border-border bg-card">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: page.todayOpen }}
        onPress={page.toggleToday}
        className={cn(
          wc.band,
          "flex-row active:bg-muted",
          wc.heroToggle,
          "border-t-0",
        )}
      >
        <Text className={wc.heroToggleText} style={nepaliTextStyle()}>
          {page.todayOpen ? copy.showLessToday : copy.showMoreToday}
        </Text>
        <Chevron open={page.todayOpen} />
      </Pressable>
      {page.todayOpen ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className={cn(
            wc.band,
            "border-t border-border",
            isTablet && "flex-row",
          )}
        >
          <Facts
            title={copy.currentTitle}
            facts={now.current}
            wide={isTablet}
          />
          {now.rainChanceLine ? (
            <Facts
              title={copy.rainTitle}
              facts={[
                {
                  key: "rain",
                  value: now.rainChanceLine,
                  label: "",
                  icon: { kind: "icon", name: "raindrops" },
                },
              ]}
              wide={isTablet}
            />
          ) : null}
          <Facts title={copy.sunTitle} facts={now.sun} wide={isTablet} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Cell({
  hour,
  starts,
  children,
  gap,
}: {
  hour: WeatherHourView;
  starts: Set<string>;
  children: ReactNode;
  gap?: boolean;
}) {
  return (
    <View
      style={{ width: COLUMN }}
      className={cn(
        wc.cell,
        gap && "gap-2",
        hour.night && wc.cellNight,
        starts.has(hour.key) && wc.dayDivider,
      )}
    >
      {children}
    </View>
  );
}

function RowValue({
  row,
  hour,
}: {
  row: WeatherHourlyRow;
  hour: WeatherHourView;
}) {
  if (row === "wind") {
    return hour.wind ? (
      <>
        <WindArrow wind={hour.wind} />
        <Text className={wc.cellText} style={nepaliTextStyle()}>
          {hour.wind.direction}
        </Text>
        <Text className={wc.cellSub}>{hour.wind.value}</Text>
      </>
    ) : null;
  }
  if (row === "uv") {
    return hour.uv ? (
      <View className="flex-row items-center gap-1.5">
        <UvDot uv={hour.uv} />
        <Text className={wc.cellText}>{hour.uv.value}</Text>
      </View>
    ) : null;
  }
  const value = {
    feels: hour.feels,
    rain_mm: hour.rainMm,
    gust: hour.gust,
    humidity: hour.humidity,
    dew: hour.dew,
  }[row];
  return <Text className={wc.cellText}>{value}</Text>;
}

function Hourly({ page }: { page: WeatherPage }) {
  const hours = page.hourGroups.flatMap((g) => g.hours);
  const starts = new Set(page.hourGroups.slice(1).map((g) => g.hours[0]!.key));
  // Captions and the first day's name follow the scroll on the UI thread, so they stay on screen.
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, scrollX.get()) }],
  }));

  return (
    <View className="border-b border-border bg-card">
      {/* One row of chips that scrolls, never wrapping onto a second line. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 py-4"
        accessibilityRole="tablist"
      >
        {page.filters.map((f) => (
          <PressScale
            key={f.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: f.active }}
            onPress={f.select}
            className={f.active ? wc.chipActive : wc.chip}
          >
            <Text
              className={f.active ? wc.chipTextActive : wc.chipText}
              style={nepaliTextStyle()}
            >
              {f.label}
            </Text>
          </PressScale>
        ))}
      </ScrollView>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View>
          <View className="flex-row">
            {page.hourGroups.map((g, i) => (
              <View
                key={g.key}
                style={{ width: g.hours.length * COLUMN }}
                className={cn(wc.dayHead, i > 0 && wc.dayDivider)}
              >
                <Animated.View style={i === 0 ? pinned : undefined}>
                  <Text className={wc.dayHeadText} style={nepaliTextStyle()}>
                    {g.label}
                  </Text>
                </Animated.View>
              </View>
            ))}
          </View>
          <View className="flex-row">
            {hours.map((h) => (
              <Cell key={h.key} hour={h} starts={starts} gap>
                <Text className={wc.cellTime} style={nepaliTextStyle()}>
                  {h.time}
                </Text>
                <WeatherGlyph glyph={h.glyph} size={40} />
                <Text className={wc.cellTemp}>{h.temperature}</Text>
              </Cell>
            ))}
          </View>
          {page.rows.map((row) => (
            <View key={row}>
              <View className={wc.rowCaption}>
                <Animated.View
                  style={pinned}
                  className={cn("flex-row", wc.rowCaptionInner)}
                >
                  <Text className={wc.rowCaptionText} style={nepaliTextStyle()}>
                    {page.copy.rows[row].label}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${page.copy.aboutRow}: ${page.copy.rows[row].label}`}
                    onPress={() => page.openInfo(row)}
                    hitSlop={12}
                  >
                    <UiIcon name="info" size={18} />
                  </Pressable>
                </Animated.View>
              </View>
              <View className="flex-row">
                {hours.map((h) => (
                  <Cell key={h.key} hour={h} starts={starts}>
                    <RowValue row={row} hour={h} />
                  </Cell>
                ))}
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function Daily({ page }: { page: WeatherPage }) {
  const { isNarrow } = useBreakpoint();
  const { copy } = page;
  return (
    <View className="border-b border-border bg-card">
      <View className={wc.band}>
        <Text
          className={cn("px-4 pb-2 pt-5", wc.sectionTitle)}
          style={nepaliTextStyle()}
        >
          {copy.dailyTitle}
        </Text>
        {page.days.map((d) => {
          const open = page.openDay === d.key;
          return (
            <Animated.View key={d.key} layout={LinearTransition.duration(200)}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => page.toggleDay(d.key)}
                className={cn(
                  "flex-row active:bg-muted",
                  wc.dayRow,
                  "gap-1.5 px-3",
                )}
              >
                <Text
                  className={cn(isNarrow ? "w-20" : "w-28", wc.dayName)}
                  numberOfLines={1}
                  style={nepaliTextStyle()}
                >
                  {isNarrow ? d.weekdayShort : d.weekday}
                </Text>
                <WeatherGlyph glyph={d.glyph} size={isNarrow ? 32 : 40} />
                <Text
                  className={cn("flex-1", wc.dayLabel)}
                  numberOfLines={1}
                  style={nepaliTextStyle()}
                >
                  {d.glyph.label}
                </Text>
                <Text className={cn("w-8 text-right", wc.dayLow)}>{d.low}</Text>
                <Text className={cn("w-8 text-right", wc.dayHigh)}>
                  {d.high}
                </Text>
                <Text
                  className={cn(
                    isNarrow ? "w-12" : "w-20",
                    "text-right",
                    wc.dayRain,
                  )}
                  numberOfLines={1}
                  style={nepaliTextStyle()}
                >
                  {d.rainAmount}
                </Text>
                <Chevron open={open} />
              </Pressable>
              {open ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  className={wc.dayPanel}
                >
                  <Text className={wc.dayPanelDate} style={nepaliTextStyle()}>
                    {d.weekday} · {d.dateLabel}
                  </Text>
                  <View className="flex-row items-center gap-4">
                    <WeatherGlyph glyph={d.glyph} size={56} />
                    <Text
                      className={cn("flex-1", wc.dayPanelLabel)}
                      style={nepaliTextStyle()}
                    >
                      {d.glyph.label} · {d.rainAmount}
                    </Text>
                  </View>
                  {d.details.map((f) => (
                    <Text key={f.key} style={nepaliTextStyle()}>
                      <Text className={wc.factLabel}>{f.label} </Text>
                      <Text className={wc.factValue}>{f.value}</Text>
                    </Text>
                  ))}
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}
        {page.toggleAllDays ? (
          <Pressable
            accessibilityRole="button"
            onPress={page.toggleAllDays}
            className={cn("active:bg-muted", wc.moreButton)}
          >
            <Text className={wc.moreButtonText} style={nepaliTextStyle()}>
              {page.allDays ? copy.showFewerDays : copy.showAllDays}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Weather — the app's drawing of `useWeatherPage` (@vedic-patro/features). A screen of its own:
 * no app header or floating nav (not in PAGE_CHROME_ROUTES), a back arrow in the sky instead.
 */
export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const { location } = usePanchangaLocation();
  const page = useWeatherPage({ location, locate: locateDevice });
  const { copy } = page;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <Hero page={page} top={insets.top} />
        {page.now ? (
          <>
            <Today page={page} />
            <Hourly page={page} />
            <Daily page={page} />
            <View className={cn(wc.band, wc.footer, "px-4")}>
              {[
                [copy.updatedTitle, copy.updated],
                [copy.locationTitle, copy.locationNote],
              ].map(([title, body]) => (
                <View key={title}>
                  <Text className={wc.footerTitle} style={nepaliTextStyle()}>
                    {title}
                  </Text>
                  <Text className={wc.footerText} style={nepaliTextStyle()}>
                    {body}
                  </Text>
                </View>
              ))}
              <Text className={wc.footerText} style={nepaliTextStyle()}>
                {copy.unitsNote}
              </Text>
              <Text className={wc.footerText} style={nepaliTextStyle()}>
                {copy.source}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      <Sheet
        open={page.info != null}
        onClose={page.closeInfo}
        title={page.info?.title}
        closeLabel={copy.close}
        placement="center"
      >
        <Text className={wc.infoBody} style={nepaliTextStyle()}>
          {page.info?.body}
        </Text>
      </Sheet>
    </View>
  );
}
