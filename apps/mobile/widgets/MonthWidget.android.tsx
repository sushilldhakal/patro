"use no memo";
// The widget runtime has no react/compiler-runtime: React Compiler output (`_c(...)` memo caches in the
// helper components below) throws there and the widget draws blank. Keep this file out of the compiler.

import { Box, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, padding, fillMaxSize, fillMaxWidth, height, paddingAll, size, width } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetCell, type WidgetItem } from "./today-widget-props";

/**
 * "पात्रो महिना" — the BS month widget (Android, Glance). Glance has no weights, so the squares are
 * sized from the widget's own width (widthDp / heightDp, passed in by scripts/patch-expo-widgets.mjs)
 * and the layout changes as the user resizes it:
 *  narrow       the month alone, today circled (Apple's month widget)
 *  wide, short  the month on the left, today and the festivals to come on the right (Google's)
 *  big          a patro month: BS day, AD day, dots for festivals and your events, then the list
 * Nothing from outside this function is used.
 */
const MonthWidget = (props: TodayWidgetProps, environment: { colorScheme?: string; widthDp?: number; heightDp?: number }) => {
  "widget";
  const dark = environment.colorScheme === "dark";
  const c = {
    bg: dark ? "#1B1A18" : "#FBF8F2", // design-ok: the widget runtime has no theme tokens
    text: dark ? "#F3EFE8" : "#1F1D1A", // design-ok
    muted: dark ? "#A39E94" : "#7A7368", // design-ok
    faint: dark ? "#5E5A53" : "#C2BBB0", // design-ok
    teal: dark ? "#5FB8B3" : "#0E5C5E", // design-ok
    red: dark ? "#FF6B5E" : "#C62828", // design-ok
    saffron: dark ? "#F2A44B" : "#C46A12", // design-ok
    white: "#FFFFFF", // design-ok
    tint: dark ? "#2A3B3A" : "#E3EFEE", // design-ok
  };
  const w = environment.widthDp ?? 250;
  const h = environment.heightDp ?? 250;
  const pad = 12;
  const cells: WidgetCell[] = props.cells ?? [];
  const heads: string[] = props.heads ?? [];
  const weeks: WidgetCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const has = (cell: WidgetCell, flag: string) => cell.k.indexOf(flag) >= 0;
  const dayColor = (cell: WidgetCell) => (has(cell, "o") ? c.faint : has(cell, "h") || has(cell, "s") ? c.red : c.text);

  const T = ({ s, sz, bold, color, center }: { s: string; sz: number; bold?: boolean; color?: string; center?: boolean }) => (
    <Text color={color ?? c.text} maxLines={1} style={{ fontSize: sz, fontWeight: bold ? "700" : "400", textAlign: center ? "center" : "start" }}>
      {s}
    </Text>
  );
  const Gap = ({ v }: { v: number }) => <Spacer modifiers={[height(v)]} />;

  /** One number per day; `gridW` is the grid's width in dp. */
  const SmallGrid = ({ gridW, gridH }: { gridW: number; gridH: number }) => {
    const cw = Math.floor(gridW / 7);
    const ch = Math.max(14, Math.floor(gridH / (weeks.length + 1)));
    const fs = Math.max(9, Math.min(14, Math.floor(Math.min(cw, ch) * 0.55)));
    const dot = Math.min(cw, ch) - 2;
    return (
      <Column>
        <Row>
          {heads.map((hd, i) => (
            <Box key={`h${i}`} contentAlignment="center" modifiers={[size(cw, ch)]}>
              <T s={hd} sz={fs - 1} bold color={i === 6 ? c.red : c.muted} center />
            </Box>
          ))}
        </Row>
        {weeks.map((week, wi) => (
          <Row key={`w${wi}`}>
            {week.map((cell, i) => (
              <Box key={`c${i}`} contentAlignment="center" modifiers={[size(cw, ch)]}>
                {has(cell, "t") ? (
                  <Box contentAlignment="center" modifiers={[size(dot, dot), background(c.red), cornerRadius(dot / 2)]}>
                    <T s={cell.d} sz={fs} bold color={c.white} center />
                  </Box>
                ) : (
                  <T s={has(cell, "o") ? "" : cell.d} sz={fs} color={dayColor(cell)} center />
                )}
              </Box>
            ))}
          </Row>
        ))}
      </Column>
    );
  };

  /** BS day, AD day, festival / event dots; today filled teal, holidays tinted. */
  const BigGrid = ({ gridW, gridH }: { gridW: number; gridH: number }) => {
    const cw = Math.floor(gridW / 7);
    const ch = Math.max(30, Math.floor((gridH - 18) / weeks.length));
    return (
      <Column>
        <Row>
          {heads.map((hd, i) => (
            <Box key={`h${i}`} contentAlignment="center" modifiers={[size(cw, 18)]}>
              <T s={hd} sz={11} bold color={i === 6 ? c.red : c.muted} center />
            </Box>
          ))}
        </Row>
        {weeks.map((week, wi) => (
          <Row key={`w${wi}`}>
            {week.map((cell, i) => {
              const today = has(cell, "t");
              const fill = today ? [background(c.teal), cornerRadius(8)] : has(cell, "h") ? [background(c.tint), cornerRadius(8)] : [];
              return (
                <Box key={`c${i}`} contentAlignment="center" modifiers={[size(cw, ch)]}>
                  <Column horizontalAlignment="center" verticalArrangement="center" modifiers={[size(cw - 2, ch - 2), ...fill]}>
                    <T s={cell.d} sz={ch > 40 ? 16 : 14} bold color={today ? c.white : dayColor(cell)} center />
                    {ch > 34 ? <T s={has(cell, "o") ? "" : cell.a} sz={9} color={today ? c.white : c.muted} center /> : null}
                    <Row>
                      {has(cell, "f") ? <Box modifiers={[size(4, 4), background(today ? c.white : c.saffron), cornerRadius(2)]} /> : null}
                      {has(cell, "f") && has(cell, "e") ? <Spacer modifiers={[width(2)]} /> : null}
                      {has(cell, "e") ? <Box modifiers={[size(4, 4), background(today ? c.white : c.teal), cornerRadius(2)]} /> : null}
                    </Row>
                  </Column>
                </Box>
              );
            })}
          </Row>
        ))}
      </Column>
    );
  };

  const hue: Record<string, [string, string]> = {
    holiday: dark ? ["#FF7A6E", "#3A2523"] : ["#B3261E", "#FBE7E5"], // design-ok
    festival: dark ? ["#F2A44B", "#3A2C1C"] : ["#A85A0E", "#FCEEDD"], // design-ok
    event: dark ? ["#6FC7C1", "#1F3332"] : ["#0E5C5E", "#E1EFEE"], // design-ok
    task: dark ? ["#A9A9FF", "#2A2A42"] : ["#4747B8", "#E9E9FB"], // design-ok
    appointment: dark ? ["#7DB8FF", "#1F2C3F"] : ["#245BB0", "#E2ECFA"], // design-ok
    shubh: dark ? ["#79CC86", "#20321F"] : ["#2E7D32", "#E4F1E5"], // design-ok
    ashubh: dark ? ["#E8957A", "#3A2820"] : ["#9C4426", "#F7E7E0"], // design-ok
    sun: dark ? ["#E8C35A", "#3A321A"] : ["#8A6A0C", "#F8F0D5"], // design-ok
  };
  /** A tinted row: the kind's colour dot, the title, and the time under it. */
  const ItemRow = ({ item }: { item: WidgetItem }) => {
    const [fg, tint] = hue[item.kind] ?? hue.event!;
    return (
      <Row verticalAlignment="center" modifiers={[fillMaxWidth(), background(tint), cornerRadius(7), padding(7, 4, 7, 4)]}>
        <Box modifiers={[width(7), height(7), background(fg), cornerRadius(4)]} />
        <Spacer modifiers={[width(7)]} />
        <Column>
          <T s={item.title} sz={13} bold color={fg} />
          {item.time ? <T s={item.time} sz={10.5} color={fg} /> : null}
        </Column>
      </Row>
    );
  };

  const today = props.days?.[0];
  const todayRows = (today?.items ?? []).filter((i) => i.kind !== "sun" && i.kind !== "shubh" && i.kind !== "ashubh");
  const coming = [...todayRows.slice(0, 2), ...(props.upcoming ?? []).filter((u) => u.time !== today?.title)];
  const root = [fillMaxSize(), background(c.bg), cornerRadius(22), paddingAll(pad)];
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  if (weeks.length === 0) {
    return (
      <Column modifiers={root}>
        <T s={props.monthTitle || props.bsDate || "Vedic Patro"} sz={16} bold color={c.red} />
      </Column>
    );
  }

  const Title = () => (
    <Row verticalAlignment="bottom" modifiers={[fillMaxWidth()]}>
      <T s={props.monthTitle} sz={w < 220 ? 13 : 16} bold color={c.red} />
      {w >= 220 ? <Spacer modifiers={[width(6)]} /> : null}
      {w >= 220 ? <T s={props.monthSub} sz={11} color={c.muted} /> : null}
    </Row>
  );

  // Narrow: the month alone.
  if (w < 230) {
    return (
      <Column modifiers={root}>
        <Title />
        <Gap v={2} />
        <SmallGrid gridW={innerW} gridH={innerH - 20} />
      </Column>
    );
  }

  // Wide and short: the month and a list beside it.
  if (h < 260) {
    const gridW = Math.min(Math.floor(innerW * 0.55), 230);
    const fit = Math.max(1, Math.floor((innerH - 46) / 32));
    return (
      <Row modifiers={root}>
        <Column modifiers={[width(gridW)]}>
          <T s={props.monthTitle} sz={13} bold color={c.red} />
          <Gap v={2} />
          <SmallGrid gridW={gridW} gridH={innerH - 20} />
        </Column>
        <Spacer modifiers={[width(12)]} />
        <Column modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="bottom">
            <T s={props.day} sz={22} bold color={c.teal} />
            <Spacer modifiers={[width(6)]} />
            <Column>
              <T s={props.weekday} sz={11} bold color={c.red} />
              <T s={props.tithiFull || props.tithi} sz={11} color={c.muted} />
            </Column>
          </Row>
          <Gap v={6} />
          {coming.slice(0, fit).map((item, i) => (
            <Column key={`r${i}`}>
              <ItemRow item={item} />
              <Gap v={5} />
            </Column>
          ))}
        </Column>
      </Row>
    );
  }

  // Big: the patro month, then what is coming.
  const listRows = h > 420 ? 3 : h > 330 ? 2 : 1;
  const gridH = innerH - 26 - 8 - listRows * 33;
  return (
    <Column modifiers={root}>
      <Row verticalAlignment="bottom" modifiers={[fillMaxWidth()]}>
        <T s={props.monthTitle} sz={17} bold color={c.red} />
        <Spacer modifiers={[width(6)]} />
        <T s={props.monthSub} sz={11} color={c.muted} />
        <Spacer modifiers={[width(10)]} />
        <T s={props.tithiFull || `${props.weekday} · ${props.tithi}`} sz={11} bold color={c.teal} />
      </Row>
      <Gap v={6} />
      <BigGrid gridW={innerW} gridH={gridH} />
      <Gap v={8} />
      {coming.slice(0, listRows).map((item, i) => (
        <Column key={`r${i}`}>
          <ItemRow item={item} />
          <Gap v={5} />
        </Column>
      ))}
    </Column>
  );
};

export default createWidget("MonthWidget", MonthWidget, EMPTY_WIDGET_PROPS);
