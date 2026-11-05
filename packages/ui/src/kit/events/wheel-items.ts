/**
 * The time wheel's columns, the same on both platforms: hour, minute (5-minute steps) and am / pm
 * in English; hours 0–23 in Nepali, as the rest of the product writes times. A time off the
 * 5-minute step (a पुष्कर moment, 12:02) stays on the wheel as its own entry.
 */
const pad = (n: number) => String(n).padStart(2, "0");

export type WheelColumn = { id: "hour" | "minute" | "meridiem"; items: { value: number; label: string }[]; value: number; pick: (v: number) => void };

export function wheelColumns(value: string, onChange: (time: string) => void, twelve: boolean, digits: (s: string) => string): WheelColumn[] {
  const [h = 0, m = 0] = value.split(":").map(Number);
  const pm = h >= 12;
  const set = (hour: number, minute: number) => onChange(`${pad(hour)}:${pad(minute)}`);
  const steps = Array.from({ length: 12 }, (_, i) => i * 5);
  const minutes = steps.includes(m) ? steps : [...steps, m].sort((a, b) => a - b);
  const hours = twelve ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
  const columns: WheelColumn[] = [
    {
      id: "hour",
      items: hours.map((n) => ({ value: n, label: digits(twelve ? String(n) : pad(n)) })),
      value: twelve ? ((h + 11) % 12) + 1 : h,
      pick: (n) => set(twelve ? (n % 12) + (pm ? 12 : 0) : n, m),
    },
    { id: "minute", items: minutes.map((n) => ({ value: n, label: digits(pad(n)) })), value: m, pick: (n) => set(h, n) },
  ];
  if (twelve)
    columns.push({
      id: "meridiem",
      items: [
        { value: 0, label: "am" },
        { value: 1, label: "pm" },
      ],
      value: pm ? 1 : 0,
      pick: (n) => set((h % 12) + (n ? 12 : 0), m),
    });
  return columns;
}
