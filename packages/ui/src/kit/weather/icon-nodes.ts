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
};

export type WeatherUiIcon = keyof typeof weatherIconNodes;
