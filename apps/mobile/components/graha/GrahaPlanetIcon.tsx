import type { ComponentProps, FC } from "react";
import type { Svg } from "react-native-svg";
import Jupiter from "@/assets/graha/jupiter.svg";
import Ketu from "@/assets/graha/ketu.svg";
import Mars from "@/assets/graha/mars.svg";
import Mercury from "@/assets/graha/mercury.svg";
import Moon from "@/assets/graha/moon.svg";
import Rahu from "@/assets/graha/rahu.svg";
import Saturn from "@/assets/graha/saturn.svg";
import Sun from "@/assets/graha/sun.svg";
import Venus from "@/assets/graha/venus.svg";
import type { GrahaKey } from "@/lib/graha-details";

type SvgIcon = FC<ComponentProps<typeof Svg>>;

const ICONS: Record<GrahaKey, SvgIcon> = {
  sun: Sun,
  moon: Moon,
  mars: Mars,
  mercury: Mercury,
  jupiter: Jupiter,
  venus: Venus,
  saturn: Saturn,
  rahu: Rahu,
  ketu: Ketu,
};

/** Spherical graha artwork — same assets the web app uses. */
export function GrahaPlanetIcon({ graha, size = 32 }: { graha: GrahaKey; size?: number }) {
  const Icon = ICONS[graha];
  if (!Icon) return null;
  return <Icon width={size} height={size} />;
}

export default GrahaPlanetIcon;
