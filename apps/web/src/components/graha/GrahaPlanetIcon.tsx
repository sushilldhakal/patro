import type { GrahaKey } from "@/lib/graha-details";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { cn } from "@/lib/utils";

type Props = {
  graha: GrahaKey;
  size?: number;
  className?: string;
};

/** Spherical graha artwork (shared with hora ring & gochar). */
export function GrahaPlanetIcon({ graha, size = 32, className }: Props) {
  const src = GRAHA_PLANET_ICON_URL[graha];
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("inline-block shrink-0 select-none", className)}
      aria-hidden
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}
