/**
 * Date converter page: mode toggle, input form, error box and the result
 * heading. Shared by the website and the app. Container and text classes are
 * separate keys because React Native does not inherit text style from a View;
 * `flex` / `flex-row` and `w-fit` / `self-start` are added by each platform.
 */
export const converterClasses = {
  modeToggle: "overflow-hidden rounded-xl border border-border",
  modeButton: "items-center gap-2 px-5 py-2.5",
  modeButtonActive: "bg-secondary",
  modeLabel: "text-sm font-semibold",
  modeLabelActive: "text-secondary-foreground",
  modeLabelIdle: "text-foreground",

  form: "items-end gap-3",
  field: "min-w-44 flex-1 gap-1",
  label: "text-xs font-semibold uppercase tracking-wide",
  input: "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
  submit: "rounded-lg bg-secondary px-5 py-2",
  submitLabel: "text-sm font-semibold text-secondary-foreground",

  errorBox: "rounded-xl border border-destructive/20 bg-destructive/10 p-4",
  errorText: "text-sm text-destructive",

  resultRow: "items-center gap-3",
  resultText: "text-2xl font-bold text-foreground",
  resultValue: "text-2xl font-bold text-secondary",
} as const;
