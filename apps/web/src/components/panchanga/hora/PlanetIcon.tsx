import type { HoraPlanetKey } from "@/lib/hora-data";
import { HORA_TO_GRAHA } from "@/lib/graha-planet-icons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";

interface PlanetIconProps {
  planet: HoraPlanetKey;
  size?: number;
}

/** Hora ring planet marker — uses shared graha SVG assets. */
export function PlanetIcon({ planet, size = 30 }: PlanetIconProps) {
  return <GrahaPlanetIcon graha={HORA_TO_GRAHA[planet]} size={size} />;
}
