import { WINDOW_OPTIONS } from "./types";

/**
 * The reminder window (`WINDOW_OPTIONS` key) for a शुभ / अशुभ period shown on a page, or
 * undefined when none matches. The API's keys mostly equal ours, but some carry a suffix
 * ("sarvartha_siddhi_yoga", "gulika_kaal"), and the older muhurta fields come with names only.
 */
export function resolveWindowKey(period: { key?: string; ne?: string; en?: string }): string | undefined {
  const key = period.key?.toLowerCase();
  if (key) {
    const exact = WINDOW_OPTIONS.find((o) => o.key === key);
    if (exact) return exact.key;
    const prefixed = WINDOW_OPTIONS.find((o) => key.startsWith(`${o.key}_`) || o.key.startsWith(`${key}_`));
    if (prefixed) return prefixed.key;
  }
  const ne = period.ne?.trim();
  const en = period.en?.trim().toLowerCase();
  return WINDOW_OPTIONS.find((o) => (ne && o.ne === ne) || (en && o.en.toLowerCase() === en))?.key;
}
