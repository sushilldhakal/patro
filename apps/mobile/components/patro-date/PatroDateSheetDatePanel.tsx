import { View } from "react-native";
import type { SelectOption } from "@/components/ui/BsNativeSelect";
import { getBSMonthLength } from "@/lib/bs-calendar";
import { clampBrowseYear } from "@/lib/patro-browse-years";
import type { PatroBrowseEra } from "@/lib/patro-era";
import type { PatroDateNavMode } from "./types";
import { PatroSheetDayTimeFields } from "./PatroSheetDayTimeFields";
import { PatroSheetMonthGrid } from "./PatroSheetMonthGrid";
import { PatroYearSheetStepper } from "./PatroYearSheetStepper";

export type PatroDateSheetDraft = {
  era: PatroBrowseEra;
  year: number;
  month: number;
  day: number;
  clock: string;
};

type Props = {
  mode: PatroDateNavMode;
  draft: PatroDateSheetDraft;
  onDraftChange: (patch: Partial<PatroDateSheetDraft>) => void;
  monthOptions: SelectOption[];
  todayAd?: string;
  showTime: boolean;
  onYearTypingPreviewChange?: (preview: string | null) => void;
  onYearInputFocus?: () => void;
};

export function PatroDateSheetDatePanel({
  mode,
  draft,
  onDraftChange,
  monthOptions,
  showTime,
  onYearTypingPreviewChange,
  onYearInputFocus,
}: Props) {
  const yearStepperProps = {
    era: draft.era,
    year: draft.year,
    onEraChange: (era: PatroBrowseEra) => {
      const year = clampBrowseYear(era, draft.year);
      const day = Math.min(draft.day, getBSMonthLength(year, draft.month));
      onDraftChange({ era, year, day });
    },
    onYearChange: (year: number) => {
      const safeDay = Math.min(draft.day, getBSMonthLength(year, draft.month));
      onDraftChange({ year, day: safeDay });
    },
    onYearTypingPreviewChange,
    onYearInputFocus,
  };

  const pickMonth = (month: number) => {
    const safeDay = Math.min(draft.day, getBSMonthLength(draft.year, month));
    onDraftChange({ month, day: safeDay });
  };

  if (mode === "year-month-time") {
    return (
      <View className="gap-2 px-4 py-4">
        <PatroSheetMonthGrid month={draft.month} monthOptions={monthOptions} onMonthChange={pickMonth} />
        <PatroYearSheetStepper {...yearStepperProps} />
        <PatroSheetDayTimeFields
          year={draft.year}
          month={draft.month}
          day={draft.day}
          clock={draft.clock}
          showTime={showTime}
          onDayChange={(day) => onDraftChange({ day })}
          onClockChange={(clock) => onDraftChange({ clock })}
        />
      </View>
    );
  }

  return (
    <View>
      {mode === "year-month" ? (
        <View className="gap-2 px-4 py-4">
          <PatroSheetMonthGrid month={draft.month} monthOptions={monthOptions} onMonthChange={pickMonth} />
          <PatroYearSheetStepper {...yearStepperProps} />
        </View>
      ) : (
        <View className="px-4 py-4">
          <PatroYearSheetStepper {...yearStepperProps} />
        </View>
      )}
    </View>
  );
}
