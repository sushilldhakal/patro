import { Ionicons } from "@/components/icons/Ionicons";
import { neutral } from "@vedic-patro/design-tokens";
import { rateToSlider, sliderToRate, type SkyTimeTransport } from "@vedic-patro/features/sky3d";
import { SkyTimeSheet as SkyTimeSheetView, type SkyTimeSheetProps } from "@vedic-patro/ui/kit/learn";

const ink = neutral.white;

const icons: SkyTimeSheetProps["icons"] = {
  up: <Ionicons name="chevron-up" size={15} color={ink} />,
  down: <Ionicons name="chevron-down" size={15} color={ink} />,
  play: <Ionicons name="play" size={22} color={ink} />,
  pause: <Ionicons name="pause" size={22} color={ink} />,
  reset: <Ionicons name="refresh" size={20} color={ink} />,
  prev: <Ionicons name="play-skip-back" size={22} color={ink} />,
  now: <Ionicons name="time-outline" size={22} color={ink} />,
  next: <Ionicons name="play-skip-forward" size={22} color={ink} />,
};

/**
 * The app's sky passes a speed-ladder rung. The shared sheet speaks in
 * simulated seconds per second, which is what that rung stands for.
 */
export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  rateValue,
  onRate,
  onTogglePlay,
  onResetRate,
  transport,
  onApplyMs,
  onClose,
}: {
  timeMs: number;
  zoneOffsetMs: number;
  rateValue?: number;
  rateMax?: number;
  onRate?: (value: number) => void;
  onTogglePlay?: () => void;
  onResetRate?: () => void;
  transport?: SkyTimeTransport;
  onApplyMs: (ms: number) => void;
  onClose: () => void;
}) {
  return (
    <SkyTimeSheetView
      timeMs={timeMs}
      zoneOffsetMs={zoneOffsetMs}
      timeRate={rateValue === undefined ? undefined : sliderToRate(rateValue)}
      onTimeRate={onRate ? (seconds) => onRate(rateToSlider(seconds)) : undefined}
      onTogglePlay={onTogglePlay}
      onResetRate={onResetRate}
      transport={transport}
      onApplyMs={onApplyMs}
      onClose={onClose}
      centered
      icons={icons}
    />
  );
}

export type { WallParts } from "@vedic-patro/domain/sky3d/sky-time";
export default SkyTimeSheet;
