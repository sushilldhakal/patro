import { memo, type ComponentProps } from "react";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { WheelChart as KitWheelChart } from "@vedic-patro/ui/kit/panchanga";

type Props = Omit<ComponentProps<typeof KitWheelChart>, "skyBase" | "nodeIcon">;

function WheelChartImpl(props: Props) {
  return (
    <KitWheelChart
      {...props}
      skyBase={import.meta.env.BASE_URL}
      nodeIcon={{ rahu: GRAHA_PLANET_ICON_URL.rahu, ketu: GRAHA_PLANET_ICON_URL.ketu }}
    />
  );
}

/** Sky discs and node artwork stay in the app. The drawing lives in the kit. */
export const WheelChart = memo(WheelChartImpl);
export type { WheelHover } from "@vedic-patro/features/panchanga-drawing";
