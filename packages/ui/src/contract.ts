/**
 * The UI kit's props — one contract for both platforms.
 *
 * `src/web/*` draws these with plain HTML + Tailwind (the website),
 * `src/native/*` with React Native + NativeWind (the app). Each platform's
 * index checks itself against `UiKit`, so a prop added here must be handled on
 * both sides or a typecheck fails.
 *
 * Classes are shared Tailwind utilities (both Tailwind 4 and NativeWind 4 read
 * them). Web-only extras (`hover:`, `focus-visible:`, transitions) go in
 * `webClassName`; React Native-only layout goes in `nativeClassName`.
 */
import type { ComponentType, ReactNode } from "react";
import type { IconSize } from "@vedic-patro/design-tokens";

/** Shared on every component. */
export type StyleProps = {
  className?: string;
  /** Applied on the website only (hover, focus rings, transitions, gradients). */
  webClassName?: string;
  /** Applied in the app only (React Native layout differences). */
  nativeClassName?: string;
  testID?: string;
};

// ─── Box ─────────────────────────────────────────────────────────────────────

/** HTML element on the website; every one is a View in the app. */
export type BoxTag = "div" | "section" | "header" | "footer" | "nav" | "main" | "article" | "aside" | "ul" | "ol" | "li";

export type BoxProps = StyleProps & {
  children?: ReactNode;
  as?: BoxTag;
  /** Accessible name (aria-label / accessibilityLabel). */
  label?: string;
  /** Width as a percentage of the parent (0–100), for the few places a class cannot say it (e.g. a computed bar). */
  widthPercent?: number;
};

// ─── Text ────────────────────────────────────────────────────────────────────

/** Text styles from the shared spec (packages/design-tokens/src/specs.ts). */
export type TextVariant =
  | "pageTitle"
  | "pageSubtitle"
  | "sectionTitle"
  | "cardTitle"
  | "label"
  | "eyebrow"
  | "body"
  | "caption"
  | "statValue";

export type TextTag = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "label" | "div";

export type TextProps = StyleProps & {
  children?: ReactNode;
  variant?: TextVariant;
  /** HTML element on the website (headings become accessibility headers in the app). Default `span`. */
  as?: TextTag;
  /** Truncate after this many lines. */
  numberOfLines?: number;
};

// ─── Input ───────────────────────────────────────────────────────────────────

export type InputType = "text" | "search" | "email" | "password" | "number";

/** `<input>` / `<textarea>` on the website, `TextInput` in the app. Controlled. */
export type InputProps = StyleProps & {
  value: string;
  onChange: (value: string) => void;
  /** Return key / Enter. */
  onSubmit?: () => void;
  placeholder?: string;
  type?: InputType;
  multiline?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Accessible name (aria-label / accessibilityLabel). */
  label?: string;
};

// ─── Pressable ───────────────────────────────────────────────────────────────

export type PressableRole = "button" | "tab" | "link" | "checkbox";

export type PressableProps = StyleProps & {
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Accessible name when the children are not text (an icon button). */
  label?: string;
  role?: PressableRole;
  /** Selected tab / checked box. */
  selected?: boolean;
};

// ─── Card ────────────────────────────────────────────────────────────────────

export type CardProps = StyleProps & {
  children?: ReactNode;
  /** Page-level card (`roomy`), dense row (`compact`), or the default. */
  size?: "default" | "roomy" | "compact";
  as?: BoxTag;
};

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = StyleProps & {
  /** Visible text. Give `children` instead for custom content; then set `ariaLabel`. */
  label?: string;
  /** Custom content in place of `label`. */
  children?: ReactNode;
  /** Accessible name when there is no `label`. */
  ariaLabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (an `<Icon />`). */
  icon?: ReactNode;
  disabled?: boolean;
  /** Extra classes for the label text. */
  textClassName?: string;
  /** Form submit on the website; ignored in the app. */
  type?: "button" | "submit";
};

// ─── Icon ────────────────────────────────────────────────────────────────────

/** A Lucide icon's node list: `import { __iconNode } from "lucide-react/dist/esm/icons/<name>"`. */
export type IconNode = ReadonlyArray<readonly [string, Readonly<Record<string, string | number>>]>;

/** Theme role the icon is drawn in (the same role colour in light and dark on both platforms). */
export type IconTone =
  | "foreground"
  | "muted"
  | "primary"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info";

export type IconProps = StyleProps & {
  node: IconNode;
  size?: IconSize | number;
  /** Default `foreground`. */
  tone?: IconTone;
  /** Solid glyph (a filled star or flag). */
  filled?: boolean;
  strokeWidth?: number;
  /** Accessible name; icons without one are hidden from screen readers. */
  label?: string;
};

// ─── Table ───────────────────────────────────────────────────────────────────

export type TableColumn = {
  key: string;
  header: ReactNode;
  /** Column width in px. The app's table scrolls sideways when the columns do not fit; the website lays out naturally. */
  width: number;
  /** Makes the header pressable (sorting). */
  onPress?: () => void;
  /** Shows a sort arrow when the header is pressable. */
  sorted?: "asc" | "desc" | null;
};

/** Classes for the table's parts; each defaults to the shared table look. */
export type TableClasses = Partial<
  Record<"root" | "head" | "headCell" | "headText" | "row" | "cell" | "emptyCell" | "emptyText", string>
>;

export type TableProps<Row> = StyleProps & {
  columns: readonly TableColumn[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  renderCell: (row: Row, column: TableColumn) => ReactNode;
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode;
  classes?: TableClasses;
};

// ─── Sheet ───────────────────────────────────────────────────────────────────

export type SheetProps = StyleProps & {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Tallest the panel may grow, as a percentage of the screen height (default 85). */
  maxHeightPercent?: number;
  children?: ReactNode;
};

// ─── The kit ─────────────────────────────────────────────────────────────────

/** What each platform's index must export. */
export type UiKit = {
  Box: ComponentType<BoxProps>;
  Text: ComponentType<TextProps>;
  Pressable: ComponentType<PressableProps>;
  Input: ComponentType<InputProps>;
  Card: ComponentType<CardProps>;
  Button: ComponentType<ButtonProps>;
  Icon: ComponentType<IconProps>;
  Table: <Row>(props: TableProps<Row>) => ReactNode;
  Sheet: ComponentType<SheetProps>;
};
