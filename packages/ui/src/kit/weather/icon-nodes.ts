import type { IconNode } from "../../contract";

/** Lucide glyphs for the weather page chrome, copied so the kit does not import lucide-react. Conditions and facts are Meteocons. */
export const weatherIconNodes = {
  arrow: [["polygon", { points: "12 2 19 21 12 17 5 21 12 2" }]] as IconNode,
  "arrow-left": [
    ["path", { d: "m12 19-7-7 7-7" }],
    ["path", { d: "M19 12H5" }],
  ] as IconNode,
  "map-pin": [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      },
    ],
    ["circle", { cx: "12", cy: "10", r: "3" }],
  ] as IconNode,
  "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]] as IconNode,
  info: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 16v-4" }],
    ["path", { d: "M12 8h.01" }],
  ] as IconNode,
  plus: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "M12 5v14" }],
  ] as IconNode,
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ] as IconNode,
  star: [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      },
    ],
  ] as IconNode,
};

export type WeatherUiIcon = keyof typeof weatherIconNodes;
