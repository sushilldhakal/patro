/**
 * Shell kit props — one contract for the website and the app.
 * Drawing lives in `web/` and `native/`; both indexes must export every name.
 */
import type { ComponentType } from "react";

export type StatCardProps = {
  label: string;
  value?: string | null;
  sub?: string;
  highlight?: boolean;
  className?: string;
  /** Fractional tile width in the app (`"48.00%"`). The website sizes the card with `className`. */
  width?: string;
};

export type ShellKit = {
  StatCard: ComponentType<StatCardProps>;
};
