"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { AccessoryWidgetBackground, Divider, HStack, Image, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import type { ComponentProps } from "react";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetDay, type WidgetItem } from "./today-widget-props";


/** An SF Symbol name (type only; erased before the widget runtime sees the code). */
type Sym = NonNullable<ComponentProps<typeof Image>["systemName"]>;
/**
 * "आजको दिन" — the day widget (iOS), after Apple Calendar's "Up Next":
 *  small      the BS date, the full tithi (कार्तिक शुक्ल द्वितीया) and the next thing on the day
 *  medium     the date and tithi on the left, today's rows on the right (tomorrow's when today is short)
 *  large      दिनभर: today and tomorrow — holiday, your events, tasks and appointments, festivals,
 *             शुभ / अशुभ windows — under a header with the AD date, the moon and sun / moon times
 *  extraLarge (iPad) today and tomorrow side by side
 *  Lock Screen: inline, circular and rectangular
 * Runs in the widget extension's own JS runtime: nothing from outside this function is used.
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
    sun: dark ? "#E8C35A" : "#B68A12", // design-ok
  };
  const hue: Record<WidgetItem["kind"], [string, string]> = {
    holiday: dark ? ["#FF7A6E", "#3A2523"] : ["#B3261E", "#FBE7E5"], // design-ok
    festival: dark ? ["#F2A44B", "#3A2C1C"] : ["#A85A0E", "#FCEEDD"], // design-ok
    event: dark ? ["#6FC7C1", "#1F3332"] : ["#0E5C5E", "#E1EFEE"], // design-ok
    task: dark ? ["#A9A9FF", "#2A2A42"] : ["#4747B8", "#E9E9FB"], // design-ok
    appointment: dark ? ["#7DB8FF", "#1F2C3F"] : ["#245BB0", "#E2ECFA"], // design-ok
    shubh: dark ? ["#79CC86", "#20321F"] : ["#2E7D32", "#E4F1E5"], // design-ok
    ashubh: dark ? ["#E8957A", "#3A2820"] : ["#9C4426", "#F7E7E0"], // design-ok
    sun: dark ? ["#E8C35A", "#3A321A"] : ["#8A6A0C", "#F8F0D5"], // design-ok
  };
  const icon: Record<WidgetItem["kind"], string> = {
    holiday: "star.fill",
    festival: "sparkles",
    event: "calendar",
    task: "checkmark.circle.fill",
    appointment: "person.crop.circle.fill",
    shubh: "checkmark.seal.fill",
    ashubh: "exclamationmark.triangle.fill",
    sun: "sun.horizon.fill",
  };
  const family = environment.widgetFamily ?? "systemMedium";
  const days: WidgetDay[] = props.days ?? [];
  const today = days[0];
  const tomorrow = days[1];
  const hasData = (props.v ?? 0) > 0 && !!today;
  const allDay = props.labels?.allDay ?? "";
  const tithiFull = props.tithiFull || props.tithi;

  const T = ({ s, size, weight, color, lines }: { s: string; size: number; weight?: "regular" | "medium" | "semibold" | "bold" | "heavy"; color?: string; lines?: number }) => (
    <Text modifiers={[font({ size, weight: weight ?? "regular" }), foregroundStyle(color ?? c.text), lineLimit(lines ?? 1), minimumScaleFactor(0.75)]}>{s}</Text>
  );

  /** Apple's row: a tinted rounded bar, the kind's icon, the title, and the time on the right. */
  const Pill = ({ item, size, showAllDay }: { item: WidgetItem; size?: number; showAllDay?: boolean }) => {
    const [fg, tint] = hue[item.kind] ?? hue.event;
    const sz = size ?? 13;
    return (
      <HStack spacing={6} alignment="center" modifiers={[padding({ horizontal: 7, vertical: 4 }), frame({ maxWidth: 1000, alignment: "leading" }), background(tint), clipShape("roundedRectangle", 7)]}>
        <Image systemName={(icon[item.kind] ?? "calendar") as Sym} size={sz - 1} color={fg} />
        <Text modifiers={[font({ size: sz, weight: "semibold" }), foregroundStyle(fg), lineLimit(1), minimumScaleFactor(0.8)]}>{item.title}</Text>
        <Spacer />
        {item.time || showAllDay ? <Text modifiers={[font({ size: sz - 2, weight: "medium" }), foregroundStyle(fg), lineLimit(1)]}>{item.time || allDay}</Text> : null}
      </HStack>
    );
  };

  const DayHeader = ({ day, size }: { day: WidgetDay; size?: number }) => (
    <HStack spacing={6} alignment="firstTextBaseline">
      <T s={day.title} size={size ?? 12} weight="bold" color={day === today ? c.red : c.muted} />
      <T s={day.sub} size={(size ?? 12) - 1} color={c.muted} />
      <Spacer />
    </HStack>
  );

  const DateBlock = ({ size, tithiLines }: { size: number; tithiLines?: number }) => (
    <VStack alignment="leading" spacing={1}>
      <T s={props.weekday} size={size * 0.31} weight="semibold" color={c.red} />
      <HStack spacing={5} alignment="firstTextBaseline">
        <T s={props.day} size={size} weight="bold" color={c.teal} />
        <VStack alignment="leading" spacing={0}>
          <T s={props.month} size={size * 0.34} weight="semibold" />
          <T s={props.year} size={size * 0.27} color={c.muted} />
        </VStack>
      </HStack>
      {tithiFull ? <T s={tithiFull} size={size * 0.3} weight="semibold" color={c.text} lines={tithiLines ?? 1} /> : null}
    </VStack>
  );

  const SunLine = ({ moon }: { moon?: boolean }) =>
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
        {moon && props.moonrise ? (
          <HStack spacing={2}>
            <Image systemName="moonrise.fill" size={10} color={c.muted} />
            <T s={props.moonrise} size={10.5} color={c.muted} />
          </HStack>
        ) : null}
      </HStack>
    ) : null;

  const plain = (d?: WidgetDay) => (d?.items ?? []).filter((i) => i.kind !== "sun");
  /** `max` lines in all: today's rows, then tomorrow's heading and rows. */
  const Rows = ({ max, size }: { max: number; size?: number }) => {
    const first = plain(today).slice(0, max);
    const room = max - Math.max(first.length, 1) - 1;
    const second = room > 0 ? plain(tomorrow).slice(0, room) : [];
    return (
      <VStack alignment="leading" spacing={4}>
        {first.length === 0 ? <T s={props.empty} size={12} color={c.muted} /> : null}
        {first.map((item, i) => (
          <Pill key={`a${i}`} item={item} size={size} />
        ))}
        {second.length > 0 && tomorrow ? <DayHeader day={tomorrow} size={11} /> : null}
        {second.map((item, i) => (
          <Pill key={`b${i}`} item={item} size={size} />
        ))}
      </VStack>
    );
  };

  const root = [containerBackground(c.bg, "widget"), widgetURL(props.url || "vedicpatro://")];

  // ── Lock Screen ─────────────────────────────────────────────────────────────
  if (family === "accessoryInline") {
    return <Text>{`${props.month} ${props.day} · ${tithiFull}`}</Text>;
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
        <Text modifiers={[font({ size: 13 }), lineLimit(1), minimumScaleFactor(0.8)]}>{tithiFull}</Text>
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
    const next = plain(today)[0] ?? plain(tomorrow)[0];
    return (
      <VStack alignment="leading" spacing={3} modifiers={root}>
        <DateBlock size={36} tithiLines={2} />
        <Spacer />
        {next ? <Pill item={next} size={12} /> : <SunLine />}
      </VStack>
    );
  }

  // ── Medium: the date and tithi, then the rows ──────────────────────────────
  if (family === "systemMedium") {
    return (
      <HStack alignment="top" spacing={12} modifiers={root}>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ width: 122, alignment: "leading" })]}>
          <DateBlock size={40} tithiLines={2} />
          {props.tithiUntil ? <T s={props.tithiUntil} size={10.5} color={c.muted} /> : null}
          <Spacer />
          <SunLine />
        </VStack>
        <VStack alignment="leading" spacing={0}>
          <Rows max={4} size={12.5} />
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // ── Large and iPad: दिनभर ─────────────────────────────────────────────────
  const Header = () => (
    <HStack alignment="top" spacing={8}>
      <VStack alignment="leading" spacing={2}>
        <DateBlock size={44} />
        {props.tithiUntil ? <T s={props.tithiUntil} size={11} color={c.muted} /> : null}
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={4}>
        <T s={props.adDate} size={13} weight="semibold" color={c.muted} />
        <Image systemName={(props.moonSymbol || "moonphase.waxing.crescent") as Sym} size={30} color={c.muted} />
        <SunLine moon />
      </VStack>
    </HStack>
  );
  const DaySection = ({ day, max }: { day: WidgetDay; max: number }) => {
    const items = day.items.filter((i) => i.kind !== "sun").slice(0, max);
    return (
      <VStack alignment="leading" spacing={4}>
        <DayHeader day={day} size={13} />
        {items.length === 0 ? <T s={props.empty} size={12} color={c.muted} /> : null}
        {items.map((item, i) => (
          <Pill key={i} item={item} showAllDay />
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
            <DaySection day={today!} max={10} />
            <Spacer />
          </VStack>
          {tomorrow ? (
            <VStack alignment="leading">
              <DaySection day={tomorrow} max={10} />
              <Spacer />
            </VStack>
          ) : null}
        </HStack>
      </VStack>
    );
  }

  // About six rows fit under the header and two day headings: today's first, then tomorrow's.
  const tomorrowHas = plain(tomorrow).length > 0;
  const todayMax = tomorrowHas ? 4 : 6;
  const todayCount = Math.min(plain(today).length, todayMax);
  const tomorrowMax = Math.max(1, 6 - Math.max(todayCount, 1));
  return (
    <VStack alignment="leading" spacing={8} modifiers={root}>
      <Header />
      <Divider />
      <DaySection day={today!} max={todayMax} />
      {tomorrow ? <DaySection day={tomorrow} max={tomorrowMax} /> : null}
      <Spacer />
    </VStack>
  );
};

export default createWidget("TodayWidget", TodayWidget, EMPTY_WIDGET_PROPS);
