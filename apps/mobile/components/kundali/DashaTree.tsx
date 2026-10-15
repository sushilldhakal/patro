import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { DashaSystem, DashaTreeNode } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { DashaTree as Shared } from "@vedic-patro/ui/kit/jyotish";

export function DashaTree(props: {
  tree: DashaTreeNode[];
  timeZone?: string;
  system?: DashaSystem;
  maxLevel?: number;
  cycleYears?: number;
}) {
  return <Shared {...props} renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />} />;
}
