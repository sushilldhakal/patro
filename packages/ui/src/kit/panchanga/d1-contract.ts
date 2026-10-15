import type { ReactNode } from "react";
import type { BhavaReferencePayload } from "@vedic-patro/api-client";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";

/** Theme paints for the native SVG. The web half uses classes and ignores these. */
export type D1ChartColors = {
  card: string;
  border: string;
  secondary: string;
  mutedForeground: string;
  foreground: string;
  danger: string;
};

export type D1HouseDetail = {
  houses: BhavaHouse[];
  houseNumber: number | null;
  reference: BhavaReferencePayload | undefined;
  onClose: () => void;
};

/**
 * One contract for both SVG halves. The app binder supplies theme colours,
 * the tablet flag, and the house-detail sheet. Agent 3's website kundali
 * D1Chart is a separate copy and should be unified with this at integration.
 */
export type D1ChartProps = {
  houses: BhavaHouse[];
  colors?: D1ChartColors;
  isTablet?: boolean;
  renderHouseDetail?: (detail: D1HouseDetail) => ReactNode;
};
