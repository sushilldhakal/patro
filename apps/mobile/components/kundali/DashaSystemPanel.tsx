import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { DashaSystem, DashaTreeResponse } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { DashaSystemPanel as Shared } from "@vedic-patro/ui/kit/jyotish";

export function DashaSystemPanel({
  timeZone,
  ...input
}: {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
}) {
  return <Shared {...input} timeZone={timeZone} renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />} />;
}
