import type { IconNode } from "../../contract";

/** Lucide arrows, shared by both drawings of the learn kit. */
export const learnIcons: { arrowLeft: IconNode; arrowRight: IconNode } = {
  arrowLeft: [
    ["path", { d: "M19 12H5" }],
    ["path", { d: "m12 19-7-7 7-7" }],
  ],
  arrowRight: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "m12 5 7 7-7 7" }],
  ],
};
