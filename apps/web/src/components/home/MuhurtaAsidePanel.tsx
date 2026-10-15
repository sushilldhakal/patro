import { Info } from "lucide-react";
import type { PanchangaDay } from "@/lib/api";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { MuhurtaAsidePanel as View } from "@vedic-patro/ui/kit/shell";

/** Hint icon stays here. The panel is `@vedic-patro/ui/kit/shell`. */
export function MuhurtaAsidePanel({ p }: { p: PanchangaDay; dateAd?: string }) {
  return <View p={p} hintIcon={<Info size={13} strokeWidth={2} className={homeClasses.muhurtaHintIcon} aria-hidden />} />;
}
