import { cn } from "./utils";

/** Scope for `--hora-*` tokens (keep on outer shell). */
export const horaTheme = "hora-theme";

export const horaStage = cn(
  "relative min-h-[520px] overflow-hidden",
  "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--brand-teal)_7%,var(--card))_0%,var(--background)_52%,var(--parchment)_100%)]",
  "dark:bg-[radial-gradient(130%_120%_at_72%_40%,#0c1018_0%,#07080d_46%,#050609_100%)]",
);

const horaGlowBase =
  "pointer-events-none absolute rounded-full blur-[90px] animate-[hora-drift_24s_ease-in-out_infinite_alternate] motion-reduce:animate-none";

export const horaGlowTeal = cn(
  horaGlowBase,
  "left-1/2 top-[20%] -ml-[210px] h-[420px] w-[420px] bg-[#0c8f93] opacity-[0.08] dark:opacity-[0.18]",
);

export const horaGlowViolet = cn(
  horaGlowBase,
  "bottom-[10%] left-[20%] h-[380px] w-[380px] bg-[#6d3ad0] opacity-[0.06] dark:opacity-[0.12]",
  "[animation-delay:-12s]",
);

export const horaGlowAmber = cn(
  horaGlowBase,
  "right-[15%] top-[35%] h-[300px] w-[300px] bg-[#e08a1e] opacity-[0.05] dark:opacity-10",
  "[animation-delay:-6s]",
);

export const horaGridBg = cn(
  "pointer-events-none absolute inset-0 bg-[length:64px_64px]",
  "bg-[linear-gradient(color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px)]",
  "[mask-image:radial-gradient(ellipse_70%_55%_at_50%_42%,#000_0%,transparent_72%)]",
  "dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]",
);

export const horaSeg = "transition-[opacity,filter] duration-[400ms] ease-out";

export const horaSegText =
  "pointer-events-none transition-opacity duration-[400ms] ease-out [&_text]:font-semibold [&_text]:[font-family:var(--pn-font)]";

export const horaTickline =
  "stroke-[color-mix(in_srgb,var(--foreground)_20%,transparent)] [stroke-width:1] dark:stroke-[rgba(255,255,255,0.16)]";

export const horaCompassNep =
  "fill-[rgba(236,240,247,0.78)] text-xs font-normal italic [font-family:var(--pn-font)]";

export const horaCompassEn =
  "fill-[var(--hora-ink-faint)] text-sm font-semibold uppercase tracking-[0.14em] [font-family:var(--pn-font)]";

export const horaHubDay =
  "fill-[var(--hora-ink)] text-base font-semibold [font-family:var(--pn-font)]";

export const horaHubRom =
  "fill-[var(--hora-ink-faint)] text-sm font-semibold uppercase tracking-[0.18em] [font-family:var(--pn-font)]";

export const horaHubNum =
  "fill-[var(--hora-ink-faint)] font-num text-sm text-base tracking-widest [font-family:var(--pn-num)]";

export const horaHubRuler =
  "text-2xl font-bold [font-family:var(--pn-font)]";

/** Fixed overlay above the ring — day / hora / lord (stable width, no flicker). */
export const horaStatusBar =
  "pointer-events-none absolute top-2 left-1/2 z-10 grid w-[min(300px,calc(100%-3rem))] -translate-x-1/2 grid-cols-3 gap-1 rounded-xl border border-border/80 bg-card/92 px-3 py-2.5 text-center shadow-sm backdrop-blur-md dark:border-white/12 dark:bg-[rgba(13,16,22,0.88)]";

export const horaStatusLabel =
  "block text-sm font-semibold uppercase tracking-[0.14em] dark:text-[var(--hora-ink-faint)]";

export const horaStatusVal =
  "mt-0.5 block truncate text-sm font-bold leading-tight text-foreground dark:text-[var(--hora-ink)]";

/** Fullscreen shell — portaled to document.body. */
export const horaExpandedShell =
  "fixed inset-0 z-[120] max-w-none overflow-hidden rounded-none border-0 shadow-none";

/** Vertical play / scrub rail on the right edge of the stage. */
export const horaControlRail = cn(
  "absolute right-2 top-1/2 z-[22] flex w-11 -translate-y-1/2 flex-col items-center gap-2",
  "h-[min(72vh,calc(100%-4rem))] max-h-[calc(100dvh-6rem)]",
  "rounded-full border border-border bg-card/95 px-1.5 py-3 shadow-md backdrop-blur-md",
  "dark:border-white/10 dark:bg-[rgba(13,16,22,0.88)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]",
  "max-sm:right-1.5 max-sm:w-10 max-sm:px-1 max-sm:py-2",
);

export const horaControlBtn = cn(
  "grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-background text-foreground transition-colors",
  "hover:border-secondary/40 hover:bg-muted dark:border-white/15 dark:hover:border-[var(--hora-yellow)]/50",
  "max-sm:h-8 max-sm:w-8",
);

export const horaPlayBtn = cn(
  horaControlBtn,
  "border-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-105",
  "dark:bg-[var(--hora-yellow)] dark:text-[#1a1408] dark:hover:bg-[#ffe24a]",
);

export const horaVerticalScrub =
  "hora-vertical-scrub min-h-0 w-2 flex-1 cursor-pointer touch-none select-none [-webkit-tap-highlight-color:transparent] max-sm:w-1.5";
