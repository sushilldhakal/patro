"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
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
 * "कार्यसूची" — the agenda widget (iOS), after Apple Calendar's "Up Next" and "List": your events,
 * tasks and appointments for the week, with holidays and today's / tomorrow's festival.
 *  small      the date and the next two rows
 *  medium     today on the left, the next day with entries on the right
 *  large      the week as a list, a heading per day, the time (or "दिनभर") on the right
 *  extraLarge (iPad) the same list, two columns
 * Runs in the widget extension's own JS runtime: nothing from outside this function is used.
 */
const AgendaWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    teal: dark ? "#5FB8B3" : "#0E5C5E", // design-ok
    red: dark ? "#FF6B5E" : "#C62828", // design-ok
  };
  const hue: Record<string, [string, string]> = {
    holiday: dark ? ["#FF7A6E", "#3A2523"] : ["#B3261E", "#FBE7E5"], // design-ok
    festival: dark ? ["#F2A44B", "#3A2C1C"] : ["#A85A0E", "#FCEEDD"], // design-ok
    event: dark ? ["#6FC7C1", "#1F3332"] : ["#0E5C5E", "#E1EFEE"], // design-ok
    task: dark ? ["#A9A9FF", "#2A2A42"] : ["#4747B8", "#E9E9FB"], // design-ok
    appointment: dark ? ["#7DB8FF", "#1F2C3F"] : ["#245BB0", "#E2ECFA"], // design-ok
  };
  const icon: Record<string, string> = { holiday: "star.fill", festival: "sparkles", event: "calendar", task: "checkmark.circle.fill", appointment: "person.crop.circle.fill" };
  const family = environment.widgetFamily ?? "systemMedium";
  const agenda: WidgetDay[] = props.agenda ?? [];
  const allDay = props.labels?.allDay ?? "";
  const noEntries = props.labels?.noEntries || props.empty || "";
  const first = agenda[0];
  const firstIsToday = !!first && first.title === props.days?.[0]?.title;

  const T = ({ s, size, weight, color }: { s: string; size: number; weight?: "regular" | "medium" | "semibold" | "bold"; color?: string }) => (
    <Text modifiers={[font({ size, weight: weight ?? "regular" }), foregroundStyle(color ?? c.text), lineLimit(1), minimumScaleFactor(0.75)]}>{s}</Text>
  );
  const Pill = ({ item, size, time }: { item: WidgetItem; size?: number; time?: boolean }) => {
    const [fg, tint] = hue[item.kind] ?? hue.event!;
    const sz = size ?? 13;
    return (
      <HStack spacing={6} alignment="center" modifiers={[padding({ horizontal: 7, vertical: 4 }), frame({ maxWidth: 1000, alignment: "leading" }), background(tint), clipShape("roundedRectangle", 7)]}>
        <Image systemName={(icon[item.kind] ?? "calendar") as Sym} size={sz - 1} color={fg} />
        <Text modifiers={[font({ size: sz, weight: "semibold" }), foregroundStyle(fg), lineLimit(1), minimumScaleFactor(0.8)]}>{item.title}</Text>
        <Spacer />
        {time ? <Text modifiers={[font({ size: sz - 2, weight: "medium" }), foregroundStyle(fg), lineLimit(1)]}>{item.time || allDay}</Text> : null}
      </HStack>
    );
  };
  const Heading = ({ day, size }: { day: WidgetDay; size?: number }) => (
    <HStack spacing={6} alignment="firstTextBaseline">
      <T s={day.title} size={size ?? 12} weight="bold" color={day === first && firstIsToday ? c.red : c.muted} />
      <T s={day.sub} size={(size ?? 12) - 1} color={c.muted} />
      <Spacer />
    </HStack>
  );
  const DateHead = ({ size }: { size: number }) => (
    <VStack alignment="leading" spacing={0}>
      <T s={props.weekday} size={size * 0.32} weight="semibold" color={c.red} />
      <HStack spacing={5} alignment="firstTextBaseline">
        <T s={props.day} size={size} weight="bold" color={c.teal} />
        <T s={props.month} size={size * 0.36} weight="semibold" />
      </HStack>
    </VStack>
  );
  /** Day headings and rows, `max` lines in all (a heading is a line). */
  const List = ({ max, size, days }: { max: number; size?: number; days?: WidgetDay[] }) => {
    const lines: { key: string; day?: WidgetDay; item?: WidgetItem }[] = [];
    for (const day of days ?? agenda) {
      if (lines.length >= max - 1) break;
      lines.push({ key: `h${lines.length}`, day });
      for (const item of day.items) {
        if (lines.length >= max) break;
        lines.push({ key: `r${lines.length}`, item });
      }
    }
    return (
      <VStack alignment="leading" spacing={4}>
        {lines.length === 0 ? <T s={noEntries} size={12} color={c.muted} /> : null}
        {lines.map((l) => (l.day ? <Heading key={l.key} day={l.day} size={size ? size - 1 : 12} /> : <Pill key={l.key} item={l.item!} size={size} time />))}
      </VStack>
    );
  };
  const root = [containerBackground(c.bg, "widget"), widgetURL(props.url || "vedicpatro://")];

  if ((props.v ?? 0) === 0) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <Image systemName="list.bullet.rectangle" size={26} color={c.teal} />
        <Spacer />
        <T s="Vedic Patro" size={15} weight="bold" color={c.teal} />
      </VStack>
    );
  }

  if (family === "systemSmall") {
    const rows = (firstIsToday ? first!.items : (first?.items ?? [])).slice(0, 2);
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <DateHead size={34} />
        {!firstIsToday && first ? <T s={`${first.title} · ${first.sub}`} size={10.5} weight="semibold" color={c.muted} /> : null}
        <Spacer />
        {rows.length === 0 ? <T s={noEntries} size={11.5} color={c.muted} /> : null}
        {rows.map((item, i) => (
          <Pill key={i} item={item} size={11.5} />
        ))}
      </VStack>
    );
  }

  if (family === "systemMedium") {
    const todayRows = firstIsToday ? first!.items.slice(0, 2) : [];
    return (
      <HStack alignment="top" spacing={12} modifiers={root}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ width: 140, alignment: "leading" })]}>
          <DateHead size={36} />
          {todayRows.length === 0 ? <T s={props.empty} size={11.5} color={c.muted} /> : null}
          {todayRows.map((item, i) => (
            <Pill key={i} item={item} size={11.5} />
          ))}
          <Spacer />
        </VStack>
        <VStack alignment="leading" spacing={0}>
          <List max={4} size={12} days={firstIsToday ? agenda.slice(1) : agenda} />
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  if (family === "systemExtraLarge") {
    const half = Math.ceil(agenda.length / 2);
    return (
      <HStack alignment="top" spacing={18} modifiers={root}>
        <VStack alignment="leading">
          <List max={14} days={agenda.slice(0, half)} />
          <Spacer />
        </VStack>
        <VStack alignment="leading">
          <List max={14} days={agenda.slice(half)} />
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={0} modifiers={root}>
      <List max={11} />
      <Spacer />
    </VStack>
  );
};

export default createWidget("AgendaWidget", AgendaWidget, EMPTY_WIDGET_PROPS);
