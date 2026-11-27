/**
 * The reader's clock: "12" (1:05 pm) or "24" (13:05), set in Preferences → General and kept by the app.
 * null until they choose: each screen then keeps its own default (the patro 24-hour, English weather 12-hour).
 */
export type ClockStyle = "12" | "24";

let style: ClockStyle | null = null;

export function setClockStyle(next: ClockStyle | null): void {
  style = next;
}

export function getClockStyle(): ClockStyle | null {
  return style;
}

/** "HH:MM" (24-hour) as the reader's clock: English "1:05 pm", Nepali "दिउँसो १:०५"; the 24-hour form untouched. */
export function formatClock12(hhmm: string, lang: string | undefined): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const h12 = h % 12 || 12;
  if ((lang ?? "ne").slice(0, 2) === "en") return `${h12}:${m} ${h < 12 ? "am" : "pm"}`;
  // The times of day a Nepali reader says before the clock.
  const part = h >= 4 && h < 12 ? "बिहान" : h >= 12 && h < 16 ? "दिउँसो" : h >= 16 && h < 19 ? "साँझ" : "राति";
  return `${part} ${h12}:${m}`;
}
