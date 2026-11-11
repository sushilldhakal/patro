import type { TodayWidgetProps } from "./today-widget-props";

/** Web and other platforms have no home-screen widget; updates are ignored. */
const PanchangaWidget = {
  updateSnapshot(_props: TodayWidgetProps): void {},
  reload(): void {},
};

export default PanchangaWidget;
