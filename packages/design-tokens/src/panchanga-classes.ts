/**
 * Panchanga section chrome. The website is the source.
 * apps/web and apps/mobile both import these strings — change them here only.
 */

export const panchangaSection =
  "overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]";

export const panchangaSectionHeader =
  "flex flex-row items-baseline justify-center gap-2.5 border-b border-border bg-secondary/[0.09] px-4 py-2.5 dark:bg-secondary/20";

export const panchangaSectionTitle = "m-0 text-sm font-bold";

/** Two cards per row below 640px, content-sized from there up. */
export const panchangaCardGrid =
  "flex w-full flex-row flex-wrap justify-center gap-2 p-4";

export const panchangaCardBase =
  "inline-flex min-w-0 max-w-full basis-[calc(50%-0.25rem)] grow flex-col gap-1 rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:w-max sm:max-w-full sm:shrink-0 sm:grow-0 sm:basis-auto";

export const panchangaFieldLabel =
  "shrink-0 whitespace-normal pt-0.5 text-sm font-semibold leading-snug text-muted-foreground sm:whitespace-nowrap";

export const panchangaFieldValue =
  "flex min-w-0 flex-row flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-base leading-snug";

export const panchangaFieldValueNowrap =
  "flex min-w-0 flex-row flex-wrap items-baseline gap-x-2 gap-y-1 whitespace-normal text-sm text-base leading-snug sm:flex-nowrap sm:whitespace-nowrap";

export const panchangaGroupLabel =
  "m-0 w-full basis-full pt-1 text-center text-sm font-semibold text-muted-foreground first:pt-0";

export const panchangaSectionNote =
  "m-0 border-t border-border px-4 py-2 text-sm leading-snug";

export const panchangaCardTitle =
  "whitespace-normal text-sm font-bold leading-snug text-foreground sm:whitespace-nowrap";

export const panchangaCardSubtitle =
  "whitespace-normal text-xs font-semibold leading-snug text-muted-foreground sm:whitespace-nowrap";
