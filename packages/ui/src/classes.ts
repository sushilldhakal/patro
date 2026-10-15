/**
 * The kit's look, written once for both platforms: which shared spec each
 * variant uses and the Tailwind classes of every part. Platform files add only
 * what their platform needs on top (web: hover/focus; app: press feedback).
 */
import { spec } from "@vedic-patro/design-tokens";
import type { ButtonSize, ButtonVariant, CardProps, IconTone, TableClasses, TextVariant } from "./contract";

export const textVariantClass: Record<TextVariant, string> = {
  pageTitle: spec.pageTitle,
  pageSubtitle: spec.pageSubtitle,
  sectionTitle: spec.sectionTitle,
  cardTitle: spec.cardTitle,
  label: spec.label,
  eyebrow: spec.eyebrow,
  body: spec.body,
  caption: spec.caption,
  statValue: spec.statValue,
};

export const cardClass: Record<NonNullable<CardProps["size"]>, string> = {
  default: spec.card,
  roomy: spec.cardRoomy,
  compact: spec.cardCompact,
};

/** Same buttons as the website's: teal secondary by default, h-8 / h-9 / h-10, `text-sm` labels. */
export const buttonClass = {
  base: spec.button,
  size: { sm: spec.buttonSm, md: spec.buttonMd, lg: spec.buttonLg } satisfies Record<ButtonSize, string>,
  variant: {
    default: "bg-secondary",
    secondary: "bg-secondary",
    outline: "border-border bg-background",
    ghost: "bg-transparent",
    destructive: "bg-destructive/10",
  } satisfies Record<ButtonVariant, string>,
  text: {
    default: "text-secondary-foreground",
    secondary: "text-secondary-foreground",
    outline: "text-foreground",
    ghost: "text-foreground",
    destructive: "text-destructive",
  } satisfies Record<ButtonVariant, string>,
  label: "text-sm",
  disabled: "opacity-50",
} as const;

/** Text colour class per icon tone (the website colours SVG strokes with currentColor). */
export const iconToneClass: Record<IconTone, string> = {
  foreground: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  destructive: "text-destructive",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

/** Theme role per icon tone (the app passes an explicit colour to react-native-svg). */
export const iconToneRole = {
  foreground: "foreground",
  muted: "mutedForeground",
  primary: "primary",
  secondary: "secondary",
  destructive: "destructive",
  success: "success",
  warning: "warning",
  info: "info",
} as const satisfies Record<IconTone, string>;

export const tableClass: Required<TableClasses> = {
  root: "rounded-xl border border-border",
  head: "border-b border-border bg-muted/50",
  headCell: spec.tableHeaderCell,
  headText: "text-xs font-semibold uppercase tracking-wide text-foreground",
  row: "border-b border-border/50",
  cell: spec.tableCell,
  emptyCell: "py-8",
  emptyText: "text-center text-sm text-foreground",
};

export const sheetClass = {
  backdrop: "bg-foreground/40",
  panel: "rounded-t-2xl border border-border bg-card px-4 pb-6 pt-3",
  handle: "mx-auto mb-3 h-1 w-10 rounded-full bg-muted",
  header: "mb-3 flex-row items-center justify-between gap-3",
  title: "text-base font-semibold text-foreground",
} as const;

/** Lucide's own artwork for the few icons the kit draws itself (sort arrows, close). */
export const kitIcons = {
  chevronUp: [["path", { d: "m18 15-6-6-6 6" }]],
  chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
  chevronsUpDown: [
    ["path", { d: "m7 15 5 5 5-5" }],
    ["path", { d: "m7 9 5-5 5 5" }],
  ],
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
} as const;
