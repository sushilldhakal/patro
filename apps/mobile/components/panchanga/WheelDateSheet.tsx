import type { Era } from "@vedic-patro/domain/era";
import { useWheelTimeSheet, wheelTransport, type WheelPlayback } from "@vedic-patro/features/sky3d";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";

/**
 * The wheel's date + time dialog: the sky's time sheet over the wheel, applying
 * the edit when it closes. Must sit in a container that fills the screen (a
 * transparent modal, or a fixed layer on the web build).
 */
export function WheelDateSheet({
  era = "bs",
  year,
  month,
  day,
  clock,
  timeZone,
  playback,
  onCommit,
  onClose,
}: {
  era?: Era;
  year: number;
  month: number;
  day: number;
  clock: string;
  timeZone?: string;
  /** The year page's playback; the sheet then shows play / pause and a speed slider. */
  playback?: WheelPlayback;
  onCommit: (year: number, month: number, day: number, clock: string) => void;
  onClose: () => void;
}) {
  const sheet = useWheelTimeSheet({
    era,
    year,
    month,
    day,
    clock,
    timeZone,
    onCommit: (_era, y, m, d, c) => onCommit(y, m, d, c),
  });
  return (
    <SkyTimeSheet
      timeMs={sheet.timeMs}
      zoneOffsetMs={sheet.zoneOffsetMs}
      transport={playback ? wheelTransport(playback) : undefined}
      onApplyMs={sheet.apply}
      onClose={() => {
        sheet.commit();
        onClose();
      }}
    />
  );
}
