import type { Era } from "@vedic-patro/domain/era";
import { useWheelTimeSheet, wheelTransport, type WheelPlayback } from "@vedic-patro/features/sky3d";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";

/**
 * The wheel's date + time dialog: the sky's time sheet over the wheel, applying
 * the edit when it closes.
 */
export function WheelDateSheet({
  era,
  year,
  month,
  day,
  clock,
  timeZone,
  playback,
  onCommit,
  onClose,
}: {
  era: Era;
  year: number;
  month: number;
  day: number;
  clock: string;
  timeZone?: string;
  /** The year page's playback; the sheet then shows play / pause and a speed slider. */
  playback?: WheelPlayback;
  onCommit: (era: Era, year: number, month: number, day: number, clock: string) => void;
  onClose: () => void;
}) {
  const sheet = useWheelTimeSheet({ era, year, month, day, clock, timeZone, onCommit });
  return (
    // Fixed to the screen (the wheel can be taller than it), above the expanded wheel.
    <div className="fixed inset-0 z-[140]">
      <SkyTimeSheet
        centered
        transport={playback ? wheelTransport(playback) : undefined}
        timeMs={sheet.timeMs}
        zoneOffsetMs={sheet.zoneOffsetMs}
        onApplyMs={sheet.apply}
        onClose={() => {
          sheet.commit();
          onClose();
        }}
      />
    </div>
  );
}
