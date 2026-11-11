"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { AccessoryWidgetBackground, Capsule, Divider, HStack, Image, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetDay, type WidgetItem } from "./today-widget-props";

/**
 * "आजको दिन" — the day widget (iOS), in the spirit of Apple's Calendar "Up Next" and "List":
 *  small     the BS date, tithi and the next thing on the day
 *  medium    the date on the left, today's list on the right (tomorrow's when today runs short)
 *  large     दिनभर: today and tomorrow in full — festivals, your events, tasks and appointments,
 *            शुभ / अशुभ windows, sunrise and sunset
 *  extraLarge (iPad) today and tomorrow side by side
 *  Lock Screen: inline, circular and rectangular
 * Runs in the widget extension's own JS runtime: nothing from outside this function is used, only
 * the @expo/ui globals. Every string arrives ready in props.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    teal: dark ? "#5FB8B3" : "#0E5C5E", // design-ok
    red: dark ? "#FF6B5E" : "#C62828", // design-ok
    saffron: dark ? "#F2A44B" : "#C46A12", // design-ok
    task: dark ? "#9C9CFF" : "#5B5BD6", // design-ok
    appt: dark ? "#6FB1FF" : "#2F6FD0", // design-ok
    shubh: dark ? "#6CC27A" : "#2E7D32", // design-ok
    ashubh: dark ? "#E08A6A" : "#A94F2D", // design-ok
    sun: dark ? "#E8C35A" : "#B68A12", // design-ok
  };
  const kindColor = (k: WidgetItem["kind"]) =>
    k === "holiday" ? c.red : k === "festival" ? c.saffron : k === "task" ? c.task : k === "appointment" ? c.appt : k === "shubh" ? c.shubh : k === "ashubh" ? c.ashubh : k === "sun" ? c.sun : c.teal;
  const family = environment.widgetFamily ?? "systemMedium";
  const days: WidgetDay[] = props.days ?? [];
  const today = days[0];
  const tomorrow = days[1];
  const hasData = (props.v ?? 0) > 0 && !!today;

  const T = ({ s, size, weight, color, lines }: { s: string; size: number; weight?: "regular" | "medium" | "semibold" | "bold" | "heavy"; color?: string; lines?: number }) => (
    <Text modifiers={[font({ size, weight: weight ?? "regular" }), foregroundStyle(color ?? c.text), lineLimit(lines ?? 1), minimumScaleFactor(0.8)]}>{s}</Text>
  );

  /** One list row: a colour bar, the title and the time under it (Apple's list look). */
  const Row = ({ item, big }: { item: WidgetItem; big?: boolean }) => (
    <HStack spacing={6} alignment="center">
      <Capsule modifiers={[frame({ width: 3, height: item.time ? (big ? 30 : 26) : big ? 18 : 16 }), foregroundStyle(kindColor(item.kind))]} />
      <VStack alignment="leading" spacing={0}>
        <T s={item.title} size={big ? 14 : 12.5} weight="semibold" color={item.kind === "holiday" ? c.red : c.text} />
        {item.time ? <T s={item.time} size={big ? 12 : 11} color={c.muted} /> : null}
      </VStack>
      <Spacer />
    </HStack>
  );

  const DayHeader = ({ day, big }: { day: WidgetDay; big?: boolean }) => (
    <HStack spacing={6} alignment="firstTextBaseline">
      <T s={day.title} size={big ? 15 : 12} weight="bold" color={c.teal} />
      <T s={day.sub} size={big ? 12 : 11} color={c.muted} />
      <Spacer />
    </HStack>
  );

  const DateBlock = ({ size }: { size: number }) => (
    <VStack alignment="leading" spacing={1}>
      <T s={props.weekday} size={size * 0.3} weight="semibold" color={c.red} />
      <HStack spacing={5} alignment="firstTextBaseline">
        <T s={props.day} size={size} weight="bold" color={c.teal} />
        <VStack alignment="leading" spacing={0}>
          <T s={props.month} size={size * 0.33} weight="semibold" />
          <T s={props.year} size={size * 0.27} color={c.muted} />
        </VStack>
      </HStack>
      {props.tithi ? <T s={props.tithi} size={size * 0.3} weight="medium" color={c.text} /> : null}
    </VStack>
  );

  const SunLine = () =>
    props.sunrise ? (
      <HStack spacing={8}>
        <HStack spacing={2}>
          <Image systemName="sunrise.fill" size={10} color={c.sun} />
          <T s={props.sunrise} size={10.5} color={c.muted} />
        </HStack>
        <HStack spacing={2}>
          <Image systemName="sunset.fill" size={10} color={c.sun} />
          <T s={props.sunset} size={10.5} color={c.muted} />
        </HStack>
      </HStack>
    ) : null;

  const plain = (d?: WidgetDay) => (d?.items ?? []).filter((i) => i.kind !== "sun");
  /** Rows for a list of `max` lines: today's, then tomorrow's under its own heading. */
  const List = ({ max, big }: { max: number; big?: boolean }) => {
    const first = plain(today).slice(0, max);
    const room = max - first.length - 1;
    const second = room > 0 ? plain(tomorrow).slice(0, room) : [];
    return (
      <VStack alignment="leading" spacing={big ? 7 : 5}>
        {first.length === 0 ? <T s={props.empty} size={12} color={c.muted} /> : null}
        {first.map((item, i) => (
          <Row key={`a${i}`} item={item} big={big} />
        ))}
        {second.length > 0 && tomorrow ? <DayHeader day={tomorrow} /> : null}
        {second.map((item, i) => (
          <Row key={`b${i}`} item={item} big={big} />
        ))}
      </VStack>
    );
  };

  const root = [containerBackground(c.bg, "widget"), widgetURL(props.url || "vedicpatro://")];

  // ── Lock Screen ─────────────────────────────────────────────────────────────
  if (family === "accessoryInline") {
    return <Text>{`${props.month} ${props.day} · ${props.tithi}`}</Text>;
  }
  if (family === "accessoryCircular") {
    return (
      <ZStack>
        <AccessoryWidgetBackground />
        <VStack spacing={-2}>
          <Text modifiers={[font({ size: 10, weight: "semibold" }), lineLimit(1), minimumScaleFactor(0.6)]}>{props.month}</Text>
          <Text modifiers={[font({ size: 22, weight: "bold" })]}>{props.day}</Text>
        </VStack>
      </ZStack>
    );
  }
  if (family === "accessoryRectangular") {
    const next = plain(today)[0] ?? plain(tomorrow)[0];
    return (
      <VStack alignment="leading" spacing={0}>
        <Text modifiers={[font({ size: 14, weight: "bold" }), lineLimit(1)]}>{`${props.month} ${props.day} · ${props.weekday}`}</Text>
        <Text modifiers={[font({ size: 13 }), lineLimit(1)]}>{props.tithi}</Text>
        {next ? <Text modifiers={[font({ size: 13, weight: "medium" }), lineLimit(1)]}>{next.time ? `${next.time} ${next.title}` : next.title}</Text> : null}
      </VStack>
    );
  }

  if (!hasData) {
    // Before the app has sent anything (just installed, not opened yet).
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        {props.day ? <DateBlock size={family === "systemSmall" ? 38 : 44} /> : <Image systemName="calendar" size={28} color={c.teal} />}
        <Spacer />
        {props.day ? null : <T s="Vedic Patro" size={15} weight="bold" color={c.teal} />}
      </VStack>
    );
  }

  // ── Small: Apple's "Up Next" ───────────────────────────────────────────────
  if (family === "systemSmall") {
    const next = plain(today)[0];
    const later = !next ? plain(tomorrow)[0] : undefined;
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <DateBlock size={38} />
        <Spacer />
        {next ? <Row item={next} /> : null}
        {later ? (
          <VStack alignment="leading" spacing={2}>
            <T s={tomorrow!.title} size={10.5} weight="semibold" color={c.muted} />
            <Row item={later} />
          </VStack>
        ) : null}
        {!next && !later ? <SunLine /> : null}
      </VStack>
    );
  }

  // ── Medium: the date, then the list ────────────────────────────────────────
  if (family === "systemMedium") {
    return (
      <HStack alignment="top" spacing={12} modifiers={root}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ width: 104, alignment: "leading" })]}>
          <DateBlock size={42} />
          <Spacer />
          <SunLine />
        </VStack>
        <VStack alignment="leading" spacing={4}>
          <List max={4} />
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // ── Large and iPad: दिनभर, today and tomorrow ──────────────────────────────
  const Header = () => (
    <HStack alignment="top" spacing={8}>
      <DateBlock size={46} />
      <Spacer />
      <VStack alignment="trailing" spacing={3}>
        <T s={props.adDate} size={13} weight="semibold" color={c.muted} />
        {props.paksha ? <T s={props.paksha} size={12} color={c.muted} /> : null}
        <SunLine />
      </VStack>
    </HStack>
  );
  const DaySection = ({ day, max }: { day: WidgetDay; max: number }) => {
    const items = day.items.slice(0, max);
    return (
      <VStack alignment="leading" spacing={5}>
        <DayHeader day={day} big />
        {items.length === 0 ? <T s={props.empty} size={12} color={c.muted} /> : null}
        {items.map((item, i) => (
          <Row key={i} item={item} big={family === "systemExtraLarge"} />
        ))}
      </VStack>
    );
  };

  if (family === "systemExtraLarge") {
    return (
      <VStack alignment="leading" spacing={10} modifiers={root}>
        <Header />
        <Divider />
        <HStack alignment="top" spacing={18}>
          <VStack alignment="leading">
            <DaySection day={today!} max={9} />
            <Spacer />
          </VStack>
          {tomorrow ? (
            <VStack alignment="leading">
              <DaySection day={tomorrow} max={9} />
              <Spacer />
            </VStack>
          ) : null}
        </HStack>
      </VStack>
    );
  }

  // About seven rows fit under the header: today's first, at least two of tomorrow's.
  const todayCount = Math.min(today!.items.length, 5);
  const tomorrowMax = Math.max(2, 7 - Math.max(todayCount, 1));
  return (
    <VStack alignment="leading" spacing={8} modifiers={root}>
      <Header />
      <Divider />
      <DaySection day={today!} max={5} />
      {tomorrow ? <DaySection day={tomorrow} max={tomorrowMax} /> : null}
      <Spacer />
    </VStack>
  );
};

export default createWidget("TodayWidget", TodayWidget, EMPTY_WIDGET_PROPS);
