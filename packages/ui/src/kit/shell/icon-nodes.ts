import type { IconNode } from "../../contract";

/** Lucide node lists shared by both drawings. Copied so the kit does not import lucide-react. */
export const shellIcons = {
  arrowLeftRight: [
    ["path", { d: "M8 3 4 7l4 4" }],
    ["path", { d: "M4 7h16" }],
    ["path", { d: "m16 21 4-4-4-4" }],
    ["path", { d: "M20 17H4" }],
  ],
} as const satisfies Record<string, IconNode>;
