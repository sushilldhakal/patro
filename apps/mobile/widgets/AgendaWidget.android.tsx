"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { Box, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, height, padding, paddingAll, size, width } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetDay, type WidgetItem } from "./today-widget-props";

/**
 * "कार्यसूची" — the agenda widget (Android, Glance): your events, tasks and appointments for the week,
 * with holidays and today's / tomorrow's festival, a heading per day. It fills whatever size the user
 * gives it (widthDp / heightDp from plugins/with-android-widget-size.js). Nothing outside is used.
 */
const AgendaWidget = (props: TodayWidgetProps, environment: { colorScheme?: string; widthDp?: number; heightDp?: number }) => {
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
  const w = environment.widthDp ?? 250;
  const h = environment.heightDp ?? 180;
  const pad = 12;
  const rowW = w - pad * 2;
  const agenda: WidgetDay[] = props.agenda ?? [];
  const allDay = props.labels?.allDay ?? "";
  const noEntries = props.labels?.noEntries || props.empty || "";
  const isToday = (d: WidgetDay) => d.title === props.days?.[0]?.title;

  const T = ({ s, sz, bold, color }: { s: string; sz: number; bold?: boolean; color?: string }) => (
    <Text color={color ?? c.text} maxLines={1} style={{ fontSize: sz, fontWeight: bold ? "700" : "400" }}>
      {s}
    </Text>
  );
  const Gap = ({ v }: { v: number }) => <Spacer modifiers={[height(v)]} />;
  const Pill = ({ item }: { item: WidgetItem }) => {
    const [fg, tint] = hue[item.kind] ?? hue.event!;
    const time = item.time || allDay;
    const timeW = time.length > 6 ? 76 : 44;
    return (
      <Row verticalAlignment="center" modifiers={[width(rowW), background(tint), cornerRadius(7), padding(7, 5, 7, 5)]}>
        <Box modifiers={[size(7, 7), background(fg), cornerRadius(4)]} />
        <Spacer modifiers={[width(6)]} />
        <Box modifiers={[width(Math.max(40, rowW - 27 - timeW))]}>
          <T s={item.title} sz={13} bold color={fg} />
        </Box>
        <T s={time} sz={11} color={fg} />
      </Row>
    );
  };

  const root = [fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(pad)];
  if ((props.v ?? 0) === 0) {
    return (
      <Column modifiers={root}>
        <T s="Vedic Patro" sz={16} bold color={c.teal} />
      </Column>
    );
  }

  // Lines that fit: a row is about 30dp, a heading 20dp; the date heading on top takes ~44dp.
  const showDate = h >= 150;
  let budget = h - pad * 2 - (showDate ? 48 : 0);
  const lines: { key: string; day?: WidgetDay; item?: WidgetItem }[] = [];
  for (const day of agenda) {
    if (budget < 20 + 30) break;
    lines.push({ key: `h${lines.length}`, day });
    budget -= 22;
    for (const item of day.items) {
      if (budget < 30) break;
      lines.push({ key: `r${lines.length}`, item });
      budget -= 30;
    }
  }
  return (
    <Column modifiers={root}>
      {showDate ? (
        <Row verticalAlignment="bottom">
          <T s={props.day} sz={30} bold color={c.teal} />
          <Spacer modifiers={[width(6)]} />
          <Column>
            <T s={props.weekday} sz={12} bold color={c.red} />
            <T s={props.month} sz={12} color={c.muted} />
          </Column>
        </Row>
      ) : null}
      {showDate ? <Gap v={6} /> : null}
      {lines.length === 0 ? <T s={noEntries} sz={12} color={c.muted} /> : null}
      {lines.map((l) =>
        l.day ? (
          <Column key={l.key}>
            <Row verticalAlignment="bottom">
              <T s={l.day.title} sz={12} bold color={isToday(l.day) ? c.red : c.muted} />
              <Spacer modifiers={[width(6)]} />
              <T s={l.day.sub} sz={11} color={c.muted} />
            </Row>
            <Gap v={4} />
          </Column>
        ) : (
          <Column key={l.key}>
            <Pill item={l.item!} />
            <Gap v={4} />
          </Column>
        ),
      )}
    </Column>
  );
};

export default createWidget("AgendaWidget", AgendaWidget, EMPTY_WIDGET_PROPS);
