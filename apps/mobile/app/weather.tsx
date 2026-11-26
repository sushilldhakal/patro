import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type PressableProps,
  type ScrollViewInstance,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { scheduleOnRN } from "react-native-worklets";
import {
  useWeatherPage,
  type WeatherFact,
  type WeatherHourView,
  type WeatherHourlyRow,
  type WeatherPage,
  type WeatherPlacesStorage,
} from "@vedic-patro/features/weather";
import { weatherInk, weatherSkyAt } from "@vedic-patro/design-tokens";
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
import { AddFlow, PlacesScreen, PressScale, placesStorage } from "@/components/weather/WeatherPlacesScreen";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useTheme } from "@/lib/theme-context";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";

/** The gap between two places' pages, seen only mid-swipe. */
const PAGE_GAP = 16;

/** One hourly column, the website's `w-16`. */
const COLUMN = 64;


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

/** Text on the sky: white at every hour, in both themes. */
const ON_SKY = "text-white";

/** The sky follows the sun, not the theme (weatherSkyAt). */
const skyColors = weatherSkyAt;

function Sky({ daylight }: { daylight: number }) {
  const colors = skyColors(daylight);
  return (
    <ExpoLinearGradient
      colors={[colors[0], colors[1]]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
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
    <View className={cn(wc.detailBlock, "px-2.5", wide && "flex-1 border-b-0")}>
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
      <Sky daylight={page.now?.daylight ?? 0} />
      <View className={wc.band}>
        <View className={cn("flex-row", wc.topBar)}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={page.copy.back}
            onPress={back}
            hitSlop={8}
            className="size-11 items-center justify-center"
          >
            <UiIcon name="arrow-left" size={24} tone="onBrand" />
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={page.copy.changePlace}
            onPress={() => page.places.setListOpen(true)}
            className={cn("flex-row", wc.placeButton)}
          >
            <UiIcon
              name={page.usingGps ? "arrow" : "map-pin"}
              size={20}
              tone="onBrand"
            />
            <Text
              className={cn("shrink", wc.heroPlace, ON_SKY)}
              numberOfLines={1}
              style={nepaliTextStyle()}
            >
              {page.placeName}
            </Text>
            <UiIcon name="chevron-down" size={18} tone="onBrand" />
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={page.copy.placesTitle}
            onPress={() => page.places.setListOpen(true)}
            hitSlop={8}
            className="size-11 items-center justify-center"
          >
            <UiIcon name="menu" size={26} tone="onBrand" />
          </PressScale>
        </View>

        {now ? (
          // Two columns, so the sky is short: the temperature, feels-like and low/high on the left;
          // the icon, condition, rain and air quality on the right.
          <Animated.View className={cn("flex-row", wc.heroBody, "px-2.5")}>
            <View className="gap-3">
              <View>
                <Text className={cn(wc.heroTemp, ON_SKY)}>{now.temperature}</Text>
                <Text className={cn(wc.heroFeels, ON_SKY)} style={nepaliTextStyle()}>
                  {now.feelsLike}
                </Text>
              </View>
              <View className="flex-row gap-5">
                {now.range.map((r) => (
                  <View key={r.key}>
                    <Text className={cn(wc.heroRangeValue, ON_SKY)}>{r.value}</Text>
                    <Text className={cn(wc.heroRangeLabel, ON_SKY)} style={nepaliTextStyle()}>
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="min-w-0 flex-1 items-end gap-1">
              <WeatherGlyph glyph={now.glyph} size={isTablet ? 96 : 72} onSky animated />
              <Text className={cn("text-right", wc.heroLine, ON_SKY)} style={nepaliTextStyle()}>
                {now.glyph.label}
              </Text>
              <Text className={cn("text-right", wc.heroFeels, ON_SKY)} style={nepaliTextStyle()}>
                {now.rainLine}
              </Text>
              {now.airLine ? (
                <Text className={cn("text-right", wc.heroFeels, ON_SKY)} style={nepaliTextStyle()}>
                  {now.airLine}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <View className="px-2.5 pb-10 pt-6">
            <Text
              className={
                page.status === "error" ? "text-base text-danger" : cn(wc.heroFeels, ON_SKY)
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
          "border-t-0 px-2.5",
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
  children,
  gap,
}: {
  hour: WeatherHourView;
  children: ReactNode;
  gap?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <View
      style={{ width: COLUMN, ...(hour.night && !isDark ? { backgroundColor: weatherInk.nightCellLight } : null) }}
      className={cn(wc.cell, gap && "gap-2", hour.night && wc.cellNight)}
    >
      {children}
    </View>
  );
}

/** Height of the tallest rain bar (the wettest hour shown). */
const RAIN_BAR = 28;
/** The bars are scaled to at least this many mm, so a drizzle-only day does not draw full bars. */
const RAIN_SCALE_MIN = 2;

function RowValue({
  row,
  hour,
  maxRain,
}: {
  row: WeatherHourlyRow;
  hour: WeatherHourView;
  maxRain: number;
}) {
  if (row === "rain_mm") {
    // The amount over a bar as tall as its share of the wettest hour, in the theme's dim accent.
    const h = hour.rain > 0 ? Math.max(2, (hour.rain / Math.max(maxRain, RAIN_SCALE_MIN)) * RAIN_BAR) : 0;
    return (
      <View className="w-full gap-1">
        <Text className={wc.cellText}>{hour.rainMm}</Text>
        <View className="w-full justify-end" style={{ height: RAIN_BAR }}>
          {h > 0 ? <View className="w-full rounded-sm bg-secondary/25 dark:bg-primary/30" style={{ height: h }} /> : null}
        </View>
      </View>
    );
  }
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
  const maxRain = Math.max(0, ...hours.map((h) => h.rain));
  let col = 0;
  // Column index where each later day starts; drawn as one full-height line.
  const lineOffsets = page.hourGroups
    .map((g) => (col += g.hours.length) - g.hours.length)
    .slice(1);
  // Captions and the first day's name follow the scroll on the UI thread, so they stay on screen.
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, scrollX.get()) }],
  }));
  // The day being scrolled through: the last day whose first column has reached the left edge. Its
  // name is held at the top left (over the table) until the next day's name arrives there.
  const dayStarts = page.hourGroups.map((g) => g.hours.length);
  for (let k = 0, acc = 0; k < dayStarts.length; k++) {
    const n = dayStarts[k]!;
    dayStarts[k] = acc * COLUMN;
    acc += n;
  }
  const [dayAt, setDayAt] = useState(0);
  useAnimatedReaction(
    () => {
      let k = 0;
      while (k + 1 < dayStarts.length && scrollX.get() >= dayStarts[k + 1]!) k++;
      return k;
    },
    (k, prev) => {
      if (k !== prev) scheduleOnRN(setDayAt, k);
    },
  );
  const heldDay = page.hourGroups[Math.min(dayAt, page.hourGroups.length - 1)];

  return (
    <View className="border-b border-border bg-card">
      {/* One row of chips that scrolls, never wrapping onto a second line. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-2.5 py-4"
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
      <View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View>
          <View className="flex-row">
            {page.hourGroups.map((g) => (
              <View key={g.key} style={{ width: g.hours.length * COLUMN }} className={wc.dayHead}>
                <Text className={wc.dayHeadText} style={nepaliTextStyle()} numberOfLines={1}>
                  {g.label}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row border-t border-border">
            {hours.map((h) => (
              <Cell key={h.key} hour={h} gap>
                <Text className={wc.cellTime} style={nepaliTextStyle()}>
                  {h.time}
                </Text>
                <WeatherGlyph glyph={h.glyph} size={40} />
                <Text className={wc.cellTemp}>{h.temperature}</Text>
              </Cell>
            ))}
          </View>
          {page.rows.map((row) => (
            <Fragment key={row}>
              {/* Above the day line (zIndex), the label on the card colour so the line passes behind it. */}
              <View className={wc.rowCaption} style={{ zIndex: 1 }}>
                <Animated.View style={[{ alignSelf: "flex-start" }, pinned]}>
                  <View className={cn("flex-row", wc.rowCaptionInner)}>
                    <Text
                      className={wc.rowCaptionText}
                      style={nepaliTextStyle()}
                    >
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
                  </View>
                </Animated.View>
              </View>
              <View className="flex-row">
                {hours.map((h) => (
                  <Cell key={h.key} hour={h}>
                    <RowValue row={row} hour={h} maxRain={maxRain} />
                  </Cell>
                ))}
              </View>
            </Fragment>
          ))}
          {lineOffsets.map((n) => (
            <View
              key={n}
              pointerEvents="none"
              className={wc.dayLine}
              style={{ left: n * COLUMN - 1 }} // over the previous column's 1px right border, not beside it
            />
          ))}
        </View>
      </Animated.ScrollView>
      {/* The held day name, over the day-name row at the left; scrolled past its start it stays. */}
      {heldDay ? (
        <View pointerEvents="none" className={cn("absolute left-0 top-0 bg-card", wc.dayHead)}>
          <Text className={wc.dayHeadText} style={nepaliTextStyle()} numberOfLines={1}>
            {heldDay.label}
          </Text>
        </View>
      ) : null}
      </View>
    </View>
  );
}

function Daily({ page }: { page: WeatherPage }) {
  const { isNarrow, isTablet } = useBreakpoint();
  const { width: windowWidth } = useWindowDimensions();
  // Under this the opened day's sections stack in one column.
  const oneColumn = windowWidth < 360;
  const { copy } = page;
  return (
    <View className="border-b border-border bg-card">
      <View className={wc.band}>
        <Text
          className={cn("px-2.5 pb-2 pt-5", wc.sectionTitle)}
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
                  "gap-1.5 px-2.5",
                )}
              >
                <Text
                  className={cn(
                    isTablet ? "w-36" : isNarrow ? "w-20" : "w-28",
                    wc.dayName,
                  )}
                  numberOfLines={1}
                  style={nepaliTextStyle()}
                >
                  {isNarrow ? d.weekdayShort : d.weekday}
                </Text>
                <WeatherGlyph glyph={d.glyph} size={isNarrow ? 32 : 40} animated />
                <Text
                  className={cn("flex-1", wc.dayLabel)}
                  numberOfLines={1}
                  style={nepaliTextStyle()}
                >
                  {d.glyph.label}
                </Text>
                <Text
                  className={cn(
                    isTablet ? "w-12" : "w-10",
                    "text-right",
                    wc.dayLow,
                  )}
                >
                  {d.low}
                </Text>
                <Text
                  className={cn(
                    isTablet ? "w-12" : "w-10",
                    "text-right",
                    wc.dayHigh,
                  )}
                >
                  {d.high}
                </Text>
                <Text
                  className={cn(
                    isTablet ? "w-32" : "w-16",
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
                  className={cn(wc.dayPanel, "px-2.5")}
                >
                  <Text className={wc.dayPanelDate} style={nepaliTextStyle()}>
                    {d.weekday} · {d.dateLabel}
                  </Text>
                  {/* Icon beside min/max and the condition, so the top takes one row. */}
                  <View className="flex-row items-center gap-4">
                    <WeatherGlyph glyph={d.glyph} size={56} animated />
                    <View className="min-w-0 flex-1 gap-1">
                      <View className="flex-row flex-wrap gap-x-5">
                        {d.range.map((r) => (
                          <Text key={r.key} style={nepaliTextStyle()}>
                            <Text className={wc.dayPanelRangeValue}>{r.value}</Text>
                            <Text className={wc.factLabel}>  {r.label}</Text>
                          </Text>
                        ))}
                      </View>
                      <Text className={wc.dayPanelLabel} style={nepaliTextStyle()}>
                        {d.glyph.label}
                      </Text>
                    </View>
                  </View>
                  {/* Two columns when the screen has room (rain | wind, then sun/moon/UV with its
                      lines in two columns); one column on a narrow phone. */}
                  <View className="flex-row flex-wrap gap-y-4">
                    {d.sections.map((sec) => {
                      const full = oneColumn || sec.facts.length > 2;
                      return (
                        <View
                          key={sec.key}
                          className={cn(wc.dayPanelSection, !full && "pr-3")}
                          style={{ width: full ? "100%" : "50%" }}
                        >
                          <Text className={wc.dayPanelTitle} style={nepaliTextStyle()}>
                            {sec.title}
                          </Text>
                          <View className="flex-row flex-wrap gap-y-3">
                            {sec.facts.map((f) => (
                              <View
                                key={f.key}
                                className="pr-2"
                                style={{ width: full && !oneColumn ? "50%" : "100%" }}
                              >
                                <FactRow fact={f} />
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
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


/** Which place is showing, as dots at the bottom centre; a dot is also a button. */
function PlaceDots({ page, bottom }: { page: WeatherPage; bottom: number }) {
  const { places, copy } = page;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom }}
      className="items-center"
    >
      <View
        accessibilityHint={copy.swipeHint}
        className={cn("flex-row", wc.dotsPill)}
      >
        {places.pages.map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            accessibilityState={{ selected: i === places.index }}
            onPress={() => places.select(i)}
            hitSlop={6}
            className="size-5 items-center justify-center"
          >
            {p.here ? (
              <View style={{ opacity: i === places.index ? 1 : 0.4 }}>
                <UiIcon name="arrow" size={14} tone="foreground" />
              </View>
            ) : (
              <View className={i === places.index ? wc.dotActive : wc.dot} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}


/**
 * One place's page of the pager: its own vertical scroll with the app's pull-to-refresh (as on
 * kundali). The scroll starts below the status bar, so iOS shows the spinner there instead of
 * behind the clock; the strip under the status bar is painted the sky's top colour.
 */
function PlacePage({ page }: { page: WeatherPage }) {
  const insets = useSafeAreaInsets();
  const refreshControl = usePageRefreshControl();
  const { copy } = page;
  return (
    <View className="flex-1">
      {/* The clock sits on the dark sky in both themes. */}
      <StatusBar style="light" />
      <View
        style={{
          height: insets.top,
          backgroundColor: skyColors(page.now?.daylight ?? 0)[0],
        }}
      />
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: insets.bottom + 72 }}
      >
        <Hero page={page} top={0} />
        {page.now ? (
          <>
            <Today page={page} />
            <Hourly page={page} />
            <Daily page={page} />
            <View className={cn(wc.band, wc.footer, "px-2.5")}>
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
    </View>
  );
}

/** The page as drawn for place `i`: the shared state, with that place's own forecast. */
function pageAt(page: WeatherPage, i: number): WeatherPage {
  const view = page.places.pages[i]!.view;
  return {
    ...page,
    ...view,
    copy: {
      ...page.copy,
      updated: view.updated,
      locationNote: view.locationNote,
    },
  };
}

/**
 * Weather — the app's drawing of `useWeatherPage` (@vedic-patro/features). A screen of its own:
 * no app header or floating nav (not in PAGE_CHROME_ROUTES), a back arrow in the sky instead.
 * Places are pages of a native horizontal pager: the finger drags the page and the next one
 * follows, like a weather app. The hourly table scrolls on its own inside it.
 */
export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { location } = usePanchangaLocation();
  const page = useWeatherPage({
    location,
    locate: locateDevice,
    storage: placesStorage,
  });
  const { copy, places } = page;

  // Dots, the list and adding a place move the pager; a swipe moves the index.
  const pager = useRef<ScrollViewInstance>(null);
  // Each page is the full screen; a gap shows between two pages only while dragging.
  const step = width + PAGE_GAP;
  useEffect(() => {
    pager.current?.scrollTo({ x: places.index * step, animated: true });
  }, [places.index, step]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={pager}
        horizontal
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        contentOffset={{ x: places.index * step, y: 0 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / step);
          if (i !== places.index) places.select(i);
        }}
      >
        {places.pages.map((p, i) => (
          <View
            key={p.id}
            style={{
              width,
              marginRight: i < places.pages.length - 1 ? PAGE_GAP : 0,
            }}
          >
            {/* Only the page and its neighbours are drawn; the rest are empty until reached. */}
            {Math.abs(i - places.index) <= 1 ? (
              <PlacePage page={pageAt(page, i)} />
            ) : null}
          </View>
        ))}
      </ScrollView>
      {places.pages.length > 1 ? (
        <PlaceDots page={page} bottom={insets.bottom + 12} />
      ) : null}
      {places.listOpen ? null : <AddFlow page={page} />}
      <PlacesScreen page={page} />
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
