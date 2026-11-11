"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { Box, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, height, padding, paddingAll, width } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetAnga, type WidgetItem } from "./today-widget-props";

/**
 * "दैनिक पञ्चाङ्ग" — the day's panchanga (Android, Glance), redrawn per size (widthDp / heightDp from
 * plugins/with-android-widget-size.js):
 *  small   the moon, the full tithi and when it ends, the nakshatra
 *  medium  the tithi on the left; nakshatra, yoga, karana and moon sign on the right
 *  tall    the limbs, sun and moon times, and the day's शुभ / अशुभ windows
 * Nothing from outside this function is used.
 */
const PanchangaWidget = (props: TodayWidgetProps, environment: { colorScheme?: string; widthDp?: number; heightDp?: number }) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    teal: dark ? "#5FB8B3" : "#0E5C5E", // design-ok
    red: dark ? "#FF6B5E" : "#C62828", // design-ok
    card: dark ? "#25231F" : "#F2EDE3", // design-ok
    shubhFg: dark ? "#79CC86" : "#2E7D32", // design-ok
    shubhBg: dark ? "#20321F" : "#E4F1E5", // design-ok
    ashubhFg: dark ? "#E8957A" : "#9C4426", // design-ok
    ashubhBg: dark ? "#3A2820" : "#F7E7E0", // design-ok
  };
  const w = environment.widthDp ?? 250;
  const h = environment.heightDp ?? 180;
  const pad = 12;
  const inner = w - pad * 2;
  const tithiFull = props.tithiFull || props.tithi;
  const angas: WidgetAnga[] = props.angas ?? [];
  const L = props.labels;
  const windows = (props.days?.[0]?.items ?? []).filter((i) => i.kind === "shubh" || i.kind === "ashubh");

  const T = ({ s, sz, bold, color }: { s: string; sz: number; bold?: boolean; color?: string }) => (
    <Text color={color ?? c.text} maxLines={1} style={{ fontSize: sz, fontWeight: bold ? "700" : "400" }}>
      {s}
    </Text>
  );
  const Gap = ({ v }: { v: number }) => <Spacer modifiers={[height(v)]} />;
  const AngaRow = ({ a, rowW }: { a: WidgetAnga; rowW: number }) => (
    <Row verticalAlignment="center" modifiers={[width(rowW)]}>
      <Box modifiers={[width(64)]}>
        <T s={a.label} sz={11} color={c.muted} />
      </Box>
      <Box modifiers={[width(Math.max(50, rowW - 64 - (a.until ? 84 : 0)))]}>
        <T s={a.value} sz={13} bold />
      </Box>
      {a.until ? <T s={a.until} sz={10} color={c.muted} /> : null}
    </Row>
  );
  const WindowPill = ({ item, rowW }: { item: WidgetItem; rowW: number }) => {
    const shubh = item.kind === "shubh";
    const fg = shubh ? c.shubhFg : c.ashubhFg;
    return (
      <Column modifiers={[width(rowW), background(shubh ? c.shubhBg : c.ashubhBg), cornerRadius(6), padding(6, 3, 6, 3)]}>
        <T s={item.title} sz={11.5} bold color={fg} />
        <T s={item.time} sz={10} color={fg} />
      </Column>
    );
  };
  const TithiBlock = ({ big }: { big: number }) => (
    <Column>
      <Row verticalAlignment="center">
        {props.moonEmoji ? <T s={props.moonEmoji} sz={big * 1.3} /> : null}
        {props.moonEmoji ? <Spacer modifiers={[width(6)]} /> : null}
        <Column>
          <T s={props.weekday} sz={big * 0.72} bold color={c.red} />
          <T s={`${props.month} ${props.day}`} sz={big * 0.72} color={c.muted} />
        </Column>
      </Row>
      <Gap v={3} />
      <Text color={c.teal} maxLines={2} style={{ fontSize: big, fontWeight: "700" }}>
        {tithiFull}
      </Text>
      {props.tithiUntil ? <T s={props.tithiUntil} sz={big * 0.68} color={c.muted} /> : null}
    </Column>
  );
  const sunText = props.sunrise ? `☀ ${props.sunrise} – ${props.sunset}` : "";

  const root = [fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(pad)];
  if ((props.v ?? 0) === 0 || !tithiFull) {
    return (
      <Column modifiers={root}>
        <T s="Vedic Patro" sz={16} bold color={c.teal} />
      </Column>
    );
  }

  // Small.
  if (w < 220) {
    const nak = angas[0];
    return (
      <Column modifiers={root}>
        <TithiBlock big={15} />
        <Gap v={6} />
        {nak && h >= 150 ? <T s={nak.label} sz={10} color={c.muted} /> : null}
        {nak && h >= 150 ? <T s={nak.value} sz={13} bold /> : null}
      </Column>
    );
  }

  // Medium: wide and short.
  if (h < 260) {
    const leftW = Math.min(150, Math.floor(inner * 0.42));
    const rightW = inner - leftW - 12;
    return (
      <Row modifiers={root}>
        <Column modifiers={[width(leftW)]}>
          <TithiBlock big={15} />
          <Gap v={4} />
          {sunText ? <T s={sunText} sz={10.5} color={c.muted} /> : null}
        </Column>
        <Spacer modifiers={[width(12)]} />
        <Column>
          {angas.slice(0, Math.max(2, Math.floor((h - pad * 2) / 26))).map((a, i) => (
            <Column key={`a${i}`}>
              <AngaRow a={a} rowW={rightW} />
              <Gap v={6} />
            </Column>
          ))}
        </Column>
      </Row>
    );
  }

  // Tall.
  const colW = Math.floor((inner - 8) / 2);
  const rows = Math.max(1, Math.min(4, Math.floor((h - pad * 2 - 240) / 38)));
  const shubh = windows.filter((x) => x.kind === "shubh").slice(0, rows);
  const ashubh = windows.filter((x) => x.kind === "ashubh").slice(0, rows);
  return (
    <Column modifiers={root}>
      <Row verticalAlignment="top">
        <Column modifiers={[width(inner - 90)]}>
          <TithiBlock big={18} />
        </Column>
        <Column>
          <T s={props.adDate} sz={12} bold color={c.muted} />
          {props.ritu ? <T s={props.ritu} sz={11} color={c.muted} /> : null}
        </Column>
      </Row>
      <Gap v={8} />
      <Column modifiers={[width(inner), background(c.card), cornerRadius(10), padding(8, 6, 8, 2)]}>
        {angas.map((a, i) => (
          <Column key={`g${i}`}>
            <AngaRow a={a} rowW={inner - 16} />
            <Gap v={5} />
          </Column>
        ))}
      </Column>
      <Gap v={6} />
      <T s={`☀ ${props.sunrise} – ${props.sunset}${props.moonrise ? `    ☾ ${props.moonrise} – ${props.moonset}` : ""}`} sz={11} color={c.muted} />
      <Gap v={8} />
      <Row verticalAlignment="top">
        <Column modifiers={[width(colW)]}>
          <T s={L?.shubh ?? ""} sz={11} bold color={c.shubhFg} />
          <Gap v={3} />
          {shubh.map((x, i) => (
            <Column key={`s${i}`}>
              <WindowPill item={x} rowW={colW} />
              <Gap v={4} />
            </Column>
          ))}
        </Column>
        <Spacer modifiers={[width(8)]} />
        <Column modifiers={[width(colW)]}>
          <T s={L?.ashubh ?? ""} sz={11} bold color={c.ashubhFg} />
          <Gap v={3} />
          {ashubh.map((x, i) => (
            <Column key={`x${i}`}>
              <WindowPill item={x} rowW={colW} />
              <Gap v={4} />
            </Column>
          ))}
        </Column>
      </Row>
    </Column>
  );
};

export default createWidget("PanchangaWidget", PanchangaWidget, EMPTY_WIDGET_PROPS);
