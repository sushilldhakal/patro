import { Column, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, fillMaxSize, paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import type { TodayWidgetProps } from "./today-widget-props";

/**
 * Home-screen widget (Android, Glance): today's BS date and tithi, the next festival and the user's
 * next event. Same props as the iOS one; runs in the widget runtime — nothing from outside used.
 */
const TodayWidget = (props: TodayWidgetProps) => {
  "widget";
  const teal = "#0E5C5E"; // design-ok: widget runtime has no theme tokens
  const muted = "#7A7368"; // design-ok
  const red = "#B3261E"; // design-ok
  return (
    <Column modifiers={[fillMaxSize(), background("#FBF8F2"), paddingAll(12)]}>
      <Text color={red} style={{ fontSize: 12, fontWeight: "600" }}>{props.weekday}</Text>
      <Text color={teal} style={{ fontSize: 22, fontWeight: "700" }} maxLines={1}>{props.bsDate}</Text>
      <Text style={{ fontSize: 13 }} maxLines={1}>{props.tithi}</Text>
      <Spacer />
      {props.festival ? <Text color={muted} style={{ fontSize: 11 }} maxLines={1}>{props.festivalWhen}</Text> : null}
      {props.festival ? <Text color={red} style={{ fontSize: 12, fontWeight: "600" }} maxLines={1}>{props.festival}</Text> : null}
      {props.event ? <Text color={muted} style={{ fontSize: 11 }} maxLines={1}>{props.eventWhen}</Text> : null}
      {props.event ? <Text style={{ fontSize: 12, fontWeight: "600" }} maxLines={1}>{props.event}</Text> : null}
    </Column>
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
