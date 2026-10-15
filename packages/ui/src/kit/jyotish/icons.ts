import type { IconNode } from "@vedic-patro/ui/contract";

/** Lucide node lists shared by both drawings. Copied so neither half imports lucide-react. */
export const iconScrollText: IconNode = [
  ["path", { d: "M15 12h-5" }],
  ["path", { d: "M15 8h-5" }],
  ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
  [
    "path",
    {
      d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
    },
  ],
];

export const iconChevronDown: IconNode = [["path", { d: "m6 9 6 6 6-6" }]];

export const iconInfo: IconNode = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 16v-4" }],
  ["path", { d: "M12 8h.01" }],
];

export const iconLoader: IconNode = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]];

export const iconBookOpen: IconNode = [
  ["path", { d: "M12 7v14" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
    },
  ],
];

export const iconChevronRight: IconNode = [["path", { d: "m9 18 6-6-6-6" }]];

export const iconSearch: IconNode = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }],
];
