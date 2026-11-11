import { Capsule, Circle, Divider, HStack, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { EMPTY_WIDGET_PROPS, type TodayWidgetProps, type WidgetCell, type WidgetItem } from "./today-widget-props";

/**
 * "पात्रो महिना" — the BS month widget (iOS):
 *  small      Apple's month: the BS month name, the weekday letters and the days, today circled
 *  medium     Google's: the month on the left, today and the festivals to come on the right
 *  large      a printed patro month: BS day, the AD day under it, dots for festivals and your events,
 *             holidays and Saturdays in red, then what is coming
 *  extraLarge (iPad) the large month with the list beside it
 * Runs in the widget extension's own JS runtime: nothing from outside this function is used.
 */
const MonthWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
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
    todayText: "#FFFFFF", // design-ok
    tint: dark ? "#2A3B3A" : "#E3EFEE", // design-ok
  };
  const family = environment.widgetFamily ?? "systemSmall";
  const cells: WidgetCell[] = props.cells ?? [];
  const heads: string[] = props.heads ?? [];
  const weeks: WidgetCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const has = (cell: WidgetCell, flag: string) => cell.k.indexOf(flag) >= 0;
  const dayColor = (cell: WidgetCell) => (has(cell, "o") ? c.faint : has(cell, "h") || has(cell, "s") ? c.red : c.text);
  const kindColor = (k: WidgetItem["kind"]) => (k === "holiday" ? c.red : k === "festival" ? c.saffron : c.teal);

  const T = ({ s, size, weight, color, lines }: { s: string; size: number; weight?: "regular" | "medium" | "semibold" | "bold"; color?: string; lines?: number }) => (
    <Text modifiers={[font({ size, weight: weight ?? "regular" }), foregroundStyle(color ?? c.text), lineLimit(lines ?? 1), minimumScaleFactor(0.75)]}>{s}</Text>
  );

  /** The compact grid (small and medium): one number per day, like Apple's month widget. */
  const SmallGrid = ({ size }: { size: number }) => (
    <VStack spacing={size * 0.25}>
      <HStack spacing={0}>
        {heads.map((h, i) => (
          <Text key={`h${i}`} modifiers={[font({ size: size * 0.78, weight: "semibold" }), foregroundStyle(i === 6 ? c.red : c.muted), frame({ maxWidth: 1000 }), lineLimit(1)]}>
            {h}
          </Text>
        ))}
      </HStack>
      {weeks.map((week, w) => (
        <HStack key={`w${w}`} spacing={0}>
          {week.map((cell, i) =>
            has(cell, "t") ? (
              <ZStack key={`c${i}`} modifiers={[frame({ maxWidth: 1000 })]}>
                <Circle modifiers={[frame({ width: size * 1.75, height: size * 1.75 }), foregroundStyle(c.red)]} />
                <Text modifiers={[font({ size, weight: "bold" }), foregroundStyle(c.todayText)]}>{cell.d}</Text>
              </ZStack>
            ) : (
              <Text key={`c${i}`} modifiers={[font({ size, weight: "medium" }), foregroundStyle(has(cell, "o") ? c.bg : dayColor(cell)), frame({ maxWidth: 1000 }), lineLimit(1)]}>
                {cell.d}
              </Text>
            ),
          )}
        </HStack>
      ))}
    </VStack>
  );

  /** The patro grid (large): BS day, AD day under it, a dot row for festivals and events. */
  const BigGrid = ({ rowHeight }: { rowHeight: number }) => (
    <VStack spacing={2}>
      <HStack spacing={0}>
        {heads.map((h, i) => (
          <Text key={`h${i}`} modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(i === 6 ? c.red : c.muted), frame({ maxWidth: 1000 })]}>
            {h}
          </Text>
        ))}
      </HStack>
      {weeks.map((week, w) => (
        <HStack key={`w${w}`} spacing={2}>
          {week.map((cell, i) => {
            const today = has(cell, "t");
            return (
              <VStack
                key={`c${i}`}
                spacing={0}
                modifiers={[frame({ maxWidth: 1000, minHeight: rowHeight, maxHeight: rowHeight }), ...(today ? [background(c.teal), clipShape("roundedRectangle", 8)] : has(cell, "h") ? [background(c.tint), clipShape("roundedRectangle", 8)] : [])]}
              >
                <Text modifiers={[font({ size: 15, weight: today ? "bold" : "semibold" }), foregroundStyle(today ? c.todayText : dayColor(cell))]}>{cell.d}</Text>
                <Text modifiers={[font({ size: 8.5 }), foregroundStyle(today ? c.todayText : c.muted)]}>{has(cell, "o") ? " " : cell.a}</Text>
                <HStack spacing={2} modifiers={[frame({ height: 5 })]}>
                  {has(cell, "f") ? <Circle modifiers={[frame({ width: 4, height: 4 }), foregroundStyle(today ? c.todayText : c.saffron)]} /> : null}
                  {has(cell, "e") ? <Circle modifiers={[frame({ width: 4, height: 4 }), foregroundStyle(today ? c.todayText : c.teal)]} /> : null}
                </HStack>
              </VStack>
            );
          })}
        </HStack>
      ))}
    </VStack>
  );

  const Row = ({ item }: { item: WidgetItem }) => (
    <HStack spacing={6} alignment="center">
      <Capsule modifiers={[frame({ width: 3, height: item.time ? 26 : 16 }), foregroundStyle(kindColor(item.kind))]} />
      <VStack alignment="leading" spacing={0}>
        <T s={item.title} size={12.5} weight="semibold" color={item.kind === "holiday" ? c.red : c.text} />
        {item.time ? <T s={item.time} size={11} color={c.muted} /> : null}
      </VStack>
      <Spacer />
    </HStack>
  );

  const today = props.days?.[0];
  const todayRows = (today?.items ?? []).filter((i) => i.kind !== "sun" && i.kind !== "shubh" && i.kind !== "ashubh");
  const root = [containerBackground(c.bg, "widget"), widgetURL(props.url || "vedicpatro://")];

  if (weeks.length === 0) {
    return (
      <VStack alignment="leading" modifiers={root}>
        <T s={props.monthTitle || props.bsDate} size={16} weight="bold" color={c.red} />
        <Spacer />
      </VStack>
    );
  }

  if (family === "systemSmall") {
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        <T s={props.monthTitle} size={12} weight="bold" color={c.red} />
        <SmallGrid size={weeks.length > 5 ? 10.5 : 11.5} />
      </VStack>
    );
  }

  if (family === "systemMedium") {
    const rows = [...todayRows.slice(0, 2), ...(props.upcoming ?? []).filter((u) => u.time !== today?.title).slice(0, todayRows.length > 0 ? 2 : 3)];
    return (
      <HStack alignment="top" spacing={14} modifiers={root}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ width: 150 })]}>
          <T s={props.monthTitle} size={12} weight="bold" color={c.red} />
          <SmallGrid size={weeks.length > 5 ? 10 : 11} />
        </VStack>
        <VStack alignment="leading" spacing={6}>
          <HStack spacing={5} alignment="firstTextBaseline">
            <T s={props.day} size={22} weight="bold" color={c.teal} />
            <VStack alignment="leading" spacing={0}>
              <T s={props.weekday} size={11} weight="semibold" color={c.red} />
              <T s={props.tithi} size={11} color={c.muted} />
            </VStack>
          </HStack>
          {rows.map((item, i) => (
            <Row key={i} item={item} />
          ))}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  const Header = () => (
    <HStack alignment="firstTextBaseline" spacing={6}>
      <T s={props.monthTitle} size={18} weight="bold" color={c.red} />
      <T s={props.monthSub} size={12} color={c.muted} />
      <Spacer />
      <T s={`${props.weekday} · ${props.tithi}`} size={12} weight="semibold" color={c.teal} />
    </HStack>
  );
  const coming = [...todayRows.slice(0, 1), ...(props.upcoming ?? []).filter((u) => u.time !== today?.title)];

  if (family === "systemExtraLarge") {
    return (
      <HStack alignment="top" spacing={18} modifiers={root}>
        <VStack alignment="leading" spacing={8}>
          <Header />
          <BigGrid rowHeight={weeks.length > 5 ? 44 : 52} />
          <Spacer />
        </VStack>
        <VStack alignment="leading" spacing={7} modifiers={[frame({ width: 220 })]}>
          {coming.slice(0, 9).map((item, i) => (
            <Row key={i} item={item} />
          ))}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={root}>
      <Header />
      <BigGrid rowHeight={weeks.length > 5 ? 32 : 38} />
      <Divider />
      {coming.slice(0, 2).map((item, i) => (
        <Row key={i} item={item} />
      ))}
      <Spacer />
    </VStack>
  );
};

export default createWidget("MonthWidget", MonthWidget, EMPTY_WIDGET_PROPS);
