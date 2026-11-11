import { Box, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll, width } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetDay, type WidgetItem } from "./today-widget-props";

/**
 * "आजको दिन" — the day widget (Android, Glance). It reads its own size (widthDp / heightDp, passed in by
 * scripts/patch-expo-widgets.mjs) and redraws as the user resizes it:
 *  small   the BS date, tithi and the next thing on the day
 *  medium  the date on the left, today's list on the right
 *  tall    दिनभर: today and tomorrow — festivals, your events, tasks and appointments, शुभ / अशुभ windows
 * Builds without the size patch get the medium layout. Nothing from outside this function is used.
 */
const TodayWidget = (props: TodayWidgetProps, environment: { colorScheme?: string; widthDp?: number; heightDp?: number }) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    faint: dark ? "#3A3833" : "#E4DED3", // design-ok
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
  const w = environment.widthDp ?? 250;
  const h = environment.heightDp ?? 160;
  const days: WidgetDay[] = props.days ?? [];
  const today = days[0];
  const tomorrow = days[1];
  const hasData = (props.v ?? 0) > 0 && !!today;
  const pad = w < 160 ? 10 : 14;

  const T = ({ s, sz, bold, color, center }: { s: string; sz: number; bold?: boolean; color?: string; center?: boolean }) => (
    <Text color={color ?? c.text} maxLines={1} style={{ fontSize: sz, fontWeight: bold ? "700" : "400", textAlign: center ? "center" : "start" }}>
      {s}
    </Text>
  );

  const ItemRow = ({ item }: { item: WidgetItem }) => (
    <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
      <Box modifiers={[width(3), height(item.time ? 28 : 16), background(kindColor(item.kind)), cornerRadius(2)]} />
      <Spacer modifiers={[width(7)]} />
      <Column>
        <T s={item.title} sz={13} bold color={item.kind === "holiday" ? c.red : c.text} />
        {item.time ? <T s={item.time} sz={11} color={c.muted} /> : null}
      </Column>
    </Row>
  );
  const Gap = ({ v }: { v: number }) => <Spacer modifiers={[height(v)]} />;

  const DateBlock = ({ big }: { big: number }) => (
    <Column>
      <T s={props.weekday} sz={big * 0.3} bold color={c.red} />
      <Row verticalAlignment="bottom">
        <T s={props.day} sz={big} bold color={c.teal} />
        <Spacer modifiers={[width(6)]} />
        <Column>
          <T s={props.month} sz={big * 0.34} bold />
          <T s={props.year} sz={big * 0.28} color={c.muted} />
        </Column>
      </Row>
      {props.tithi ? <T s={props.tithi} sz={big * 0.3} color={c.text} /> : null}
    </Column>
  );

  const plain = (d?: WidgetDay) => (d?.items ?? []).filter((i) => i.kind !== "sun");
  const DayHead = ({ day }: { day: WidgetDay }) => (
    <Row verticalAlignment="bottom">
      <T s={day.title} sz={13} bold color={c.teal} />
      <Spacer modifiers={[width(6)]} />
      <T s={day.sub} sz={11} color={c.muted} />
    </Row>
  );
  const rowsFor = (list: WidgetItem[], n: number, key: string) =>
    list.slice(0, n).map((item, i) => (
      <Column key={`${key}${i}`}>
        <ItemRow item={item} />
        <Gap v={5} />
      </Column>
    ));

  const root = [fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(pad)];

  if (!hasData) {
    return (
      <Column modifiers={root}>
        <DateBlock big={w < 160 ? 34 : 42} />
      </Column>
    );
  }

  // Small: about 2×2 cells.
  if (w < 200 || h < 120) {
    const next = plain(today)[0] ?? plain(tomorrow)[0];
    return (
      <Column modifiers={root}>
        <DateBlock big={34} />
        <Gap v={6} />
        {next && h >= 140 ? <ItemRow item={next} /> : null}
      </Column>
    );
  }

  // Medium: wide and short.
  if (h < 230) {
    const fit = Math.max(1, Math.floor((h - pad * 2) / 34));
    const first = plain(today).slice(0, fit);
    const second = first.length < fit - 1 ? plain(tomorrow).slice(0, fit - first.length - 1) : [];
    return (
      <Row modifiers={root}>
        <Column modifiers={[width(Math.min(120, w * 0.4))]}>
          <DateBlock big={40} />
          <Gap v={4} />
          {props.sunrise ? <T s={`↑ ${props.sunrise}  ↓ ${props.sunset}`} sz={11} color={c.muted} /> : null}
        </Column>
        <Spacer modifiers={[width(10)]} />
        <Column modifiers={[fillMaxWidth()]}>
          {first.length === 0 ? <T s={props.empty} sz={12} color={c.muted} /> : null}
          {rowsFor(first, fit, "a")}
          {second.length > 0 && tomorrow ? <DayHead day={tomorrow} /> : null}
          {second.length > 0 ? <Gap v={4} /> : null}
          {rowsFor(second, fit, "b")}
        </Column>
      </Row>
    );
  }

  // Tall: दिनभर, today and tomorrow.
  const budget = Math.max(3, Math.floor((h - pad * 2 - 96) / 33));
  const todayItems = today!.items;
  const firstN = Math.min(todayItems.length, Math.max(2, budget - 3));
  const secondN = Math.max(0, budget - Math.max(firstN, 1) - 1);
  return (
    <Column modifiers={root}>
      <Row verticalAlignment="top" modifiers={[fillMaxWidth()]}>
        <DateBlock big={42} />
        <Spacer modifiers={[width(12)]} />
        <Column>
          <T s={props.adDate} sz={12} bold color={c.muted} />
          {props.sunrise ? <T s={`↑ ${props.sunrise}  ↓ ${props.sunset}`} sz={11} color={c.muted} /> : null}
        </Column>
      </Row>
      <Gap v={8} />
      <Box modifiers={[fillMaxWidth(), height(1), background(c.faint)]} />
      <Gap v={8} />
      <DayHead day={today!} />
      <Gap v={5} />
      {todayItems.length === 0 ? <T s={props.empty} sz={12} color={c.muted} /> : null}
      {rowsFor(todayItems, firstN, "a")}
      {tomorrow && secondN > 0 ? <Gap v={4} /> : null}
      {tomorrow && secondN > 0 ? <DayHead day={tomorrow} /> : null}
      {tomorrow && secondN > 0 ? <Gap v={5} /> : null}
      {tomorrow && secondN > 0 ? rowsFor(tomorrow.items, secondN, "b") : null}
    </Column>
  );
};

export default createWidget("TodayWidget", TodayWidget, EMPTY_WIDGET_PROPS);
