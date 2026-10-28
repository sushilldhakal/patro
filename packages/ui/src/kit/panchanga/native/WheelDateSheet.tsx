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
  return renderSheet({
    transport: playback ? wheelTransport(playback) : undefined,
    timeMs: sheet.timeMs,
    zoneOffsetMs: sheet.zoneOffsetMs,
    onApplyMs: sheet.apply,
    onClose: () => {
      // Close first, jump after: moving the wheel to another year is heavy, and doing it before
      // the sheet left kept the sheet on screen, so a tap outside looked like it did nothing.
      onClose();
      requestAnimationFrame(() => setTimeout(sheet.commit, 0));
    },
  });
}
