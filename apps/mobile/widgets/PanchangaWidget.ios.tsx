"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { Divider, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
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
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetAnga, type WidgetItem } from "./today-widget-props";


/** An SF Symbol name (type only; erased before the widget runtime sees the code). */
type Sym = NonNullable<ComponentProps<typeof Image>["systemName"]>;
/**
 * "दैनिक पञ्चाङ्ग" — the day's panchanga (iOS):
 *  small      the moon, the full tithi (कार्तिक शुक्ल द्वितीया) and when it ends, the nakshatra
 *  medium     the tithi on the left; nakshatra, yoga, karana and moon sign on the right, with end times
 *  large      the date, the five limbs, sun and moon times, and the day's शुभ / अशुभ windows
 *  extraLarge (iPad) the same, wider
 * Runs in the widget extension's own JS runtime: nothing from outside this function is used.
 */
const PanchangaWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    teal: dark ? "#5FB8B3" : "#0E5C5E", // design-ok
    red: dark ? "#FF6B5E" : "#C62828", // design-ok
    sun: dark ? "#E8C35A" : "#B68A12", // design-ok
    card: dark ? "#25231F" : "#F2EDE3", // design-ok
    shubh: dark ? ["#79CC86", "#20321F"] : ["#2E7D32", "#E4F1E5"], // design-ok
    ashubh: dark ? ["#E8957A", "#3A2820"] : ["#9C4426", "#F7E7E0"], // design-ok
  };
  const family = environment.widgetFamily ?? "systemMedium";
  const tithiFull = props.tithiFull || props.tithi;
  const angas: WidgetAnga[] = props.angas ?? [];
  const L = props.labels;
  const windows = (props.days?.[0]?.items ?? []).filter((i) => i.kind === "shubh" || i.kind === "ashubh");

  const T = ({ s, size, weight, color, lines }: { s: string; size: number; weight?: "regular" | "medium" | "semibold" | "bold"; color?: string; lines?: number }) => (
    <Text modifiers={[font({ size, weight: weight ?? "regular" }), foregroundStyle(color ?? c.text), lineLimit(lines ?? 1), minimumScaleFactor(0.75)]}>{s}</Text>
  );
  const Moon = ({ size }: { size: number }) => <Image systemName={(props.moonSymbol || "moonphase.waxing.crescent") as Sym} size={size} color={c.sun} />;
  const AngaRow = ({ a, size }: { a: WidgetAnga; size?: number }) => (
    <HStack spacing={6} alignment="firstTextBaseline">
      <Text modifiers={[font({ size: (size ?? 13) - 2 }), foregroundStyle(c.muted), lineLimit(1), frame({ width: 62, alignment: "leading" })]}>{a.label}</Text>
      <T s={a.value} size={size ?? 13} weight="semibold" />
      <Spacer />
      {a.until ? <T s={a.until} size={(size ?? 13) - 3} color={c.muted} /> : null}
    </HStack>
  );
  const TimeCell = ({ symbol, label, value, tint }: { symbol: string; label: string; value: string; tint: string }) => (
    <VStack spacing={1} modifiers={[frame({ maxWidth: 1000 })]}>
      <Image systemName={(symbol) as Sym} size={13} color={tint} />
      <T s={value} size={12} weight="semibold" />
      <T s={label} size={9.5} color={c.muted} />
    </VStack>
  );
  const Times = () => (
    <HStack spacing={4} modifiers={[padding({ vertical: 6 }), background(c.card), clipShape("roundedRectangle", 10)]}>
      <TimeCell symbol="sunrise.fill" label={L?.sunrise ?? ""} value={props.sunrise} tint={c.sun} />
      <TimeCell symbol="sunset.fill" label={L?.sunset ?? ""} value={props.sunset} tint={c.sun} />
      {props.moonrise ? <TimeCell symbol="moonrise.fill" label={L?.moonrise ?? ""} value={props.moonrise} tint={c.muted} /> : null}
      {props.moonset ? <TimeCell symbol="moonset.fill" label={L?.moonset ?? ""} value={props.moonset} tint={c.muted} /> : null}
    </HStack>
  );
  const WindowPill = ({ item }: { item: WidgetItem }) => {
    const [fg, tint] = item.kind === "shubh" ? c.shubh : c.ashubh;
    return (
      <HStack spacing={5} modifiers={[padding({ horizontal: 6, vertical: 3 }), frame({ maxWidth: 1000, alignment: "leading" }), background(tint!), clipShape("roundedRectangle", 6)]}>
        <Text modifiers={[font({ size: 11.5, weight: "semibold" }), foregroundStyle(fg!), lineLimit(1), minimumScaleFactor(0.75)]}>{item.title}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 10 }), foregroundStyle(fg!), lineLimit(1)]}>{item.time}</Text>
      </HStack>
    );
  };
  const root = [containerBackground(c.bg, "widget"), widgetURL(props.url || "vedicpatro://")];

  if ((props.v ?? 0) === 0 || !tithiFull) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <Moon size={28} />
        <Spacer />
        <T s="Vedic Patro" size={15} weight="bold" color={c.teal} />
      </VStack>
    );
  }

  const TithiBlock = ({ size, lines }: { size: number; lines?: number }) => (
    <VStack alignment="leading" spacing={2}>
      <HStack spacing={6}>
        <Moon size={size * 1.5} />
        <VStack alignment="leading" spacing={0}>
          <T s={props.weekday} size={size * 0.75} weight="semibold" color={c.red} />
          <T s={`${props.month} ${props.day}`} size={size * 0.75} color={c.muted} />
        </VStack>
      </HStack>
      <T s={tithiFull} size={size} weight="bold" color={c.teal} lines={lines ?? 2} />
      {props.tithiUntil ? <T s={props.tithiUntil} size={size * 0.68} color={c.muted} /> : null}
    </VStack>
  );

  if (family === "systemSmall") {
    const nak = angas[0];
    return (
      <VStack alignment="leading" spacing={3} modifiers={root}>
        <TithiBlock size={15} />
        <Spacer />
        {nak ? (
          <VStack alignment="leading" spacing={0}>
            <T s={nak.label} size={10} color={c.muted} />
            <T s={nak.value} size={13} weight="semibold" />
          </VStack>
        ) : null}
      </VStack>
    );
  }

  if (family === "systemMedium") {
    return (
      <HStack alignment="top" spacing={12} modifiers={root}>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ width: 130, alignment: "leading" })]}>
          <TithiBlock size={15} />
          <Spacer />
          <HStack spacing={6}>
            <HStack spacing={2}>
              <Image systemName="sunrise.fill" size={10} color={c.sun} />
              <T s={props.sunrise} size={10.5} color={c.muted} />
            </HStack>
            <HStack spacing={2}>
              <Image systemName="sunset.fill" size={10} color={c.sun} />
              <T s={props.sunset} size={10.5} color={c.muted} />
            </HStack>
          </HStack>
        </VStack>
        <VStack alignment="leading" spacing={7}>
          {angas.slice(0, 4).map((a, i) => (
            <AngaRow key={i} a={a} size={13} />
          ))}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  const shubh = windows.filter((w) => w.kind === "shubh");
  const ashubh = windows.filter((w) => w.kind === "ashubh");
  const rows = family === "systemExtraLarge" ? 6 : 3;
  return (
    <VStack alignment="leading" spacing={8} modifiers={root}>
      <HStack alignment="top" spacing={8}>
        <TithiBlock size={18} lines={1} />
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <T s={props.adDate} size={12} weight="semibold" color={c.muted} />
          {props.ritu ? <T s={props.ritu} size={11} color={c.muted} /> : null}
        </VStack>
      </HStack>
      <VStack alignment="leading" spacing={5} modifiers={[padding({ horizontal: 8, vertical: 7 }), background(c.card), clipShape("roundedRectangle", 10)]}>
        {angas.map((a, i) => (
          <AngaRow key={i} a={a} size={13} />
        ))}
      </VStack>
      <Times />
      <HStack alignment="top" spacing={8}>
        <VStack alignment="leading" spacing={4}>
          <T s={L?.shubh ?? ""} size={11} weight="bold" color={c.shubh[0]} />
          {shubh.slice(0, rows).map((w, i) => (
            <WindowPill key={i} item={w} />
          ))}
        </VStack>
        <VStack alignment="leading" spacing={4}>
          <T s={L?.ashubh ?? ""} size={11} weight="bold" color={c.ashubh[0]} />
          {ashubh.slice(0, rows).map((w, i) => (
            <WindowPill key={i} item={w} />
          ))}
        </VStack>
      </HStack>
      <Spacer />
    </VStack>
  );
};

export default createWidget("PanchangaWidget", PanchangaWidget, EMPTY_WIDGET_PROPS);
