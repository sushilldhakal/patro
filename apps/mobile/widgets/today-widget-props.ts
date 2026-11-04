/** What the home-screen widget shows, already in the reader's language and digits. */
export type TodayWidgetProps = {
  /** "कात्तिक १९, २०८३" */
  bsDate: string;
  weekday: string;
  /** "दशमी · कृष्ण पक्ष" */
  tithi: string;
  /** The next festival's name, or "" */
  festival: string;
  /** "भोलि" / "कात्तिक २२" */
  festivalWhen: string;
  /** The user's next event, or "" */
  event: string;
  /** "आज १०:१५" */
  eventWhen: string;
};
