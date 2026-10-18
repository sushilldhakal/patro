/** Rashifal tone colours: the score-bar fill and the tone text, per navatara tone. */

/** Same union as the API's NavataraTone (api-client), restated so tokens stay contract-free. */
export type NavataraTone = "best" | "good" | "neutral" | "bad" | "worst";

/**
 * Score bar fill per tone. Kept as a separate scale from the tone *background*
 * chips so a 0–100 meter reads as a meter rather than as another badge.
 */
const TONE_BAR: Record<NavataraTone, string> = {
  best: "bg-emerald-500",
  good: "bg-emerald-400/80",
  neutral: "bg-amber-400/80",
  bad: "bg-orange-500/80",
  worst: "bg-rose-500",
};

export function rashifalToneBar(tone: NavataraTone | undefined): string {
  return TONE_BAR[tone ?? "neutral"];
}

const TONE_TEXT: Record<NavataraTone, string> = {
  best: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-amber-600 dark:text-amber-400",
  bad: "text-orange-600 dark:text-orange-400",
  worst: "text-rose-600 dark:text-rose-400",
};

export function rashifalToneText(tone: NavataraTone | undefined): string {
  return TONE_TEXT[tone ?? "neutral"];
}
