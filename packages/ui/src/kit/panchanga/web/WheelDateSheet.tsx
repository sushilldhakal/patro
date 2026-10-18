import type { ReactNode } from "react";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { useWheelTimeSheet, wheelTransport, type WheelPlayback } from "@vedic-patro/features/sky3d";

export type WheelDateSheetSlot = {
  centered?: boolean;
  timeMs: number;
  zoneOffsetMs: number;
  transport?: ReturnType<typeof wheelTransport>;
  onApplyMs: (ms: number) => void;
  onClose: () => void;
};

export type WheelDateSheetProps = {
  era?: Era;
  year: number;
  month: number;
  day: number;
  clock: string;
  timeZone?: string;
  playback?: WheelPlayback;
  onCommit: (era: Era, year: number, month: number, day: number, clock: string) => void;
  onClose: () => void;
  /** The app's sky time sheet. The kit does not import it. */
  renderSheet: (slot: WheelDateSheetSlot) => ReactNode;
};

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
  renderSheet,
}: WheelDateSheetProps) {
  const sheet = useWheelTimeSheet({ era, year, month, day, clock, timeZone, onCommit });
  const slot: WheelDateSheetSlot = {
    centered: true,
    transport: playback ? wheelTransport(playback) : undefined,
    timeMs: sheet.timeMs,
    zoneOffsetMs: sheet.zoneOffsetMs,
    onApplyMs: sheet.apply,
    onClose: () => {
      sheet.commit();
      onClose();
    },
  };
  return <div className="fixed inset-0 z-[140]">{renderSheet(slot)}</div>;
}
