import type { IconNode } from "@vedic-patro/ui/contract";

/** Lucide node lists shared by both drawings. Copied so neither half imports lucide-react. */
export const iconChevronLeft: IconNode = [["path", { d: "m15 18-6-6 6-6" }]];
export const iconChevronRight: IconNode = [["path", { d: "m9 18 6-6-6-6" }]];
export const iconCalendarSync: IconNode = [
  ["path", { d: "M11 10v4h4" }],
  ["path", { d: "m11 14 1.535-1.605a5 5 0 0 1 8 1.5" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "m21 18-1.535 1.605a5 5 0 0 1-8-1.5" }],
  ["path", { d: "M21 22v-4h-4" }],
  ["path", { d: "M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4.3" }],
  ["path", { d: "M3 10h4" }],
  ["path", { d: "M8 2v4" }],
];

export const iconViewMonth: IconNode = [ ["path", { d: "M8 2v4" }], ["path", { d: "M16 2v4" }], ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }], ["path", { d: "M3 10h18" }], ["path", { d: "M8 14h.01" }], ["path", { d: "M12 14h.01" }], ["path", { d: "M16 14h.01" }], ["path", { d: "M8 18h.01" }], ["path", { d: "M12 18h.01" }], ["path", { d: "M16 18h.01" }] ];
export const iconViewPanchanga: IconNode = [ ["circle", { cx: "12", cy: "12", r: "4" }], ["path", { d: "M12 2v2" }], ["path", { d: "M12 20v2" }], ["path", { d: "m4.93 4.93 1.41 1.41" }], ["path", { d: "m17.66 17.66 1.41 1.41" }], ["path", { d: "M2 12h2" }], ["path", { d: "M20 12h2" }], ["path", { d: "m6.34 17.66-1.41 1.41" }], ["path", { d: "m19.07 4.93-1.41 1.41" }] ];
export const iconViewWeek: IconNode = [ ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }] ];
export const iconViewDay: IconNode = [ ["path", { d: "M11 14h1v4" }], ["path", { d: "M16 2v4" }], ["path", { d: "M3 10h18" }], ["path", { d: "M8 2v4" }], ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }] ];
export const iconViewYear: IconNode = [ ["rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }], ["rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }], ["rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }], ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" }] ];
export const iconViewList: IconNode = [ ["path", { d: "M3 5h.01" }], ["path", { d: "M3 12h.01" }], ["path", { d: "M3 19h.01" }], ["path", { d: "M8 5h13" }], ["path", { d: "M8 12h13" }], ["path", { d: "M8 19h13" }] ];
export const iconCheck: IconNode = [["path", { d: "M20 6 9 17l-5-5" }]];
export const iconPlus: IconNode = [ ["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }] ];
export const iconTrash2: IconNode = [ ["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }] ];

export const iconViewMulti: IconNode = [ ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M12 3v18" }] ];

/** One icon per home view, for the view dropdown. */
export const HOME_VIEW_ICONS = {
  calendar: iconViewMonth,
  panchanga: iconViewPanchanga,
  week: iconViewWeek,
  day: iconViewDay,
  multi: iconViewMulti,
  year: iconViewYear,
  list: iconViewList,
} as const;
