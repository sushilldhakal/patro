/**
 * Panchanga kit props — one contract, drawn in web/ and native/.
 * Navigation stays in the app (onViewMore / render slots). Copy comes from
 * the page hooks in @vedic-patro/features.
 */
import type { ReactNode } from "react";
import type { LocationParams, PanchangaDay } from "@vedic-patro/api-client";
import type { BhavaHouse } from "@vedic-patro/domain/jyotish/bhava";

export type PlanetEventsPanelProps = {
  /** Civil-day Julian identity from panchanga (`jd_ut`). */
  jdUt: number;
  /** Civil `date_ad` from panchanga (for relative day math). */
  refDateAd?: string;
  location: LocationParams;
  /** Opens the full gochar page. No control is drawn without it. */
  onViewMore?: () => void;
};

export type MuhurtaNowPanelProps = {
  p: PanchangaDay;
  clock?: string;
  /** Civil AD date (YYYY-MM-DD) the user is viewing — not necessarily today. */
  viewedDateAd?: string;
};

export type EphemerisModeBannerProps = Omit<MuhurtaNowPanelProps, "p"> & {
  /** The at-time reading, once it arrives; the banner shows from the clock alone before that. */
  p?: PanchangaDay;
};

export type GocharPromoCardProps = {
  onPress: () => void;
  className?: string;
  /** Hides the explanatory line. The website's full card shows it. */
  compact?: boolean;
};

export type SunriseD1ChartPanelProps = {
  p: PanchangaDay;
  /** The app's D1 drawing (website kundali chart, app panchanga chart). */
  renderChart: (houses: BhavaHouse[]) => ReactNode;
  /** Retrograde / combust key, shown when any planet in the chart carries one. */
  renderLegend: () => ReactNode;
};
