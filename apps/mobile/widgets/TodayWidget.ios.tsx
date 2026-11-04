import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { containerBackground, font, foregroundStyle, lineLimit, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { TodayWidgetProps } from "./today-widget-props";

/**
 * Home-screen widget (iOS): today's BS date and tithi, the next festival and the user's next event.
 * Runs in the widget extension's own runtime — no hooks, no imports used inside, no outside values.
 */
const TodayWidget = (props: TodayWidgetProps, environment: { widgetFamily?: string }) => {
  "widget";
  const teal = "#0E5C5E"; // design-ok: widget runtime has no theme tokens
  const muted = "#7A7368"; // design-ok
  const red = "#B3261E"; // design-ok
  const small = environment.widgetFamily === "systemSmall";
  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground("#FBF8F2", "widget"), padding({ all: 2 })]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(red)]}>{props.weekday}</Text>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: small ? 20 : 24, weight: "bold" }), foregroundStyle(teal), lineLimit(1)]}>{props.bsDate}</Text>
      <Text modifiers={[font({ size: 13, weight: "medium" }), lineLimit(1)]}>{props.tithi}</Text>
      <Spacer />
      {props.festival ? (
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{props.festivalWhen}</Text>
          <Text modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(red), lineLimit(1)]}>{props.festival}</Text>
        </VStack>
      ) : null}
      {!small && props.event ? (
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{props.eventWhen}</Text>
          <Text modifiers={[font({ size: 12, weight: "semibold" }), lineLimit(1)]}>{props.event}</Text>
        </VStack>
      ) : null}
    </VStack>
  );
};

export default createWidget("TodayWidget", TodayWidget, {
  bsDate: "",
  weekday: "",
  tithi: "",
  festival: "",
  festivalWhen: "",
  event: "",
  eventWhen: "",
});
