/**
 * Component specs: the Tailwind classes for the building blocks every page is
 * made of. The website and the app render these same strings (React DOM and
 * React Native + NativeWind), so a card, a label or a page title cannot drift
 * between them.
 *
 * Rules for what goes here:
 * - Only utilities both Tailwind 4 and NativeWind 4 understand: no `hover:`,
 *   `focus-visible:`, `group-*` or `[&_svg]` selectors. Those stay in the
 *   component that needs them, next to the spec.
 * - Sizes come from the design tokens (text steps, `space`, `radius`), never
 *   `[Npx]`.
 * - Colour is left to the caller (`text-muted-foreground` where a label is
 *   quiet): the text inherits the page's foreground, as the website's own
 *   markup does.
 * - One form per thing. The website had three paddings and four trackings for
 *   the same card and label; the most common one won and the rest were
 *   migrated to it.
 *
 * Use it with `cn(spec.card, className)`.
 */

export const spec = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  /** The default content card. */
  card: "rounded-xl border border-border bg-card p-4",
  /** A card that carries a heading and body, on roomy layouts. */
  cardRoomy: "rounded-2xl border border-border bg-card p-5",
  /** Dense list rows and small panels. */
  cardCompact: "rounded-xl border border-border bg-card p-3.5",
  /** A pill-sized control or chip surface. */
  chip: "rounded-lg border border-border bg-card px-2.5 py-1.5",
  /** Recessed well inside a card (table headers, inputs' groups). */
  inset: "rounded-lg bg-surface-inset p-3",

  // ── Text ──────────────────────────────────────────────────────────────────
  /** h1 of a page. */
  pageTitle: "text-2xl font-bold",
  pageSubtitle: "mt-0.5 text-sm",
  /** Heading of a section or a card. */
  sectionTitle: "text-xl font-bold",
  cardTitle: "text-base font-semibold",
  /** Small uppercase label above a value (stat cards, table groups). */
  label: "text-sm font-semibold uppercase tracking-wide",
  /** Smaller, wider-tracked kicker above a heading. */
  eyebrow: "text-xs font-semibold uppercase tracking-eyebrow",
  body: "text-sm",
  caption: "text-xs",
  /** The big figure in a stat card or clock. */
  statValue: "text-base font-semibold leading-snug text-foreground",

  // ── Page layout ───────────────────────────────────────────────────────────
  /** Page content column. */
  pageShell: "mx-auto max-w-page space-y-8 px-4 py-8 sm:px-6",
  pageHeaderRow: "flex flex-row items-start gap-3",
  /** Space between a page's sections. */
  sectionStack: "space-y-8",

  // ── Stat card (label + value + sub) ───────────────────────────────────────
  statCard: "flex flex-col gap-1 rounded-xl border border-border bg-card p-4",
  statCardHighlight: "border-secondary/60 bg-secondary/10",

  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeaderCell: "px-3 py-2 text-xs font-semibold uppercase tracking-wide",
  tableCell: "px-3 py-2 text-sm",

  // ── Status tones (soft backgrounds with matching text) ────────────────────
  toneGood: "bg-tone-good text-success",
  toneBad: "bg-tone-bad text-danger",

  // ── Buttons (heights match the website's shadcn sizes) ───────────────────
  /** Shared with the website. Hover, focus and icon padding stay on the website button. */
  button: "flex-row items-center justify-center rounded-lg border border-transparent",
  buttonSm: "h-8 gap-1.5 px-2.5",
  buttonMd: "h-9 gap-2 px-3",
  buttonLg: "h-10 gap-2 px-4",
} as const;

export type SpecName = keyof typeof spec;
