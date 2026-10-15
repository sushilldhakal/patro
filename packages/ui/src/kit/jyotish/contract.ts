/**
 * Jyotish kit props — one contract for the website and the app.
 * `web/` draws these with HTML, `native/` with React Native. Both indexes
 * satisfy `JyotishKit`.
 */
import type { ComponentType } from "react";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";

export type SaitSourcesProps = {
  category: SaitCategoryId;
};

export type JyotishKit = {
  SaitSources: ComponentType<SaitSourcesProps>;
};
