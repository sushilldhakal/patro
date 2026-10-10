/**
 * Warm the code-split chunks for the secondary aside tabs (साइत, दैनिक मुहूर्त)
 * so switching to them is instant — no Suspense skeleton. Safe to call
 * repeatedly; the dynamic import is de-duplicated by the bundler. Failures are
 * swallowed: this is a background nicety, not a user-visible action.
 *
 * Kept in its own (component-free) module so importing it never pulls the panel
 * chunks into the eager home bundle, and to satisfy react-refresh's
 * one-export-kind-per-file rule.
 */
export function prefetchAsidePanels(): void {
  import("@/components/home/SaitAsidePanel").catch(() => {});
  import("@/components/home/MuhurtaAsidePanel").catch(() => {});
}
