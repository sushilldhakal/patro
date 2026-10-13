import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Type steps. tailwind-merge otherwise treats an unknown `text-*` as a font
 * size, so `text-foreground` and `text-body` cancelled each other and the
 * colour class never reached the element.
 */
const TEXT_SIZE = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
  "caption",
  "body",
  "title",
  "display",
  "diagram-2xs",
  "diagram-xs",
  "diagram-sm",
]);

/** Alignment and wrapping. Not colours, and not sizes. */
const TEXT_NOT_COLOR = new Set([
  "left",
  "center",
  "right",
  "justify",
  "start",
  "end",
  "ellipsis",
  "clip",
  "wrap",
  "nowrap",
  "balance",
  "pretty",
]);

const isCustomTextColor = (value: string) =>
  !TEXT_SIZE.has(value) && !TEXT_NOT_COLOR.has(value) && !value.startsWith("[");

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["caption", "body", "title", "display", "diagram-2xs", "diagram-xs", "diagram-sm"],
        },
      ],
      "text-color": [{ text: [isCustomTextColor] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
