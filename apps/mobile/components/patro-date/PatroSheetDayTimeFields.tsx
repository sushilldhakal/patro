import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { BsNativeSelect } from "@/components/ui/BsNativeSelect";
import { getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import {
  formatClockParts,
  from12h,
  parseClockParts,
  to12h,
} from "@/components/panchanga/use-panchanga-mode";
import { cn } from "@/lib/utils";

type Props = {
  year: number;
  month: number;
  day: number;
  clock: string;
  showTime: boolean;
  onDayChange: (day: number) => void;
  onClockChange: (clock: string) => void;
};

/** Day + time rows — matches web {@link PatroMobileDateSheetDraft} mobile sheet. */
export function PatroSheetDayTimeFields({
  year,
  month,
  day,
  clock,
  showTime,
  onDayChange,
  onClockChange,
}: Props) {
  const { pick, digits } = useLocale();

  const dayOptions = useMemo(() => {
    const len = getBSMonthLength(year, month);
    return Array.from({ length: len }, (_, i) => ({
      value: i + 1,
      label: digits(i + 1),
    }));
  }, [year, month, digits]);

  const { hour, minute } = parseClockParts(clock || "00:00");
  const { hour12, meridiem } = to12h(hour);

  const hour12Options = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: digits(String(i + 1).padStart(2, "0")),
      })),
    [digits],
  );

  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: digits(String(i).padStart(2, "0")),
      })),
    [digits],
  );

  const setTime = (nextHour12: number, nextMinute: number, nextMeridiem: "AM" | "PM") => {
    onClockChange(formatClockParts(from12h(nextHour12, nextMeridiem), nextMinute));
  };

  return (
    <View className="gap-3 pt-1">
      <View className="flex-row items-center justify-center gap-2">
        <Text className="text-body font-semibold text-muted-foreground">{pick("गते", "Day")}</Text>
        <BsNativeSelect
          value={day}
          options={dayOptions}
          ariaLabel={pick("गते", "Day")}
          onChange={onDayChange}
          minWidth={80}
        />
      </View>

      {showTime ? (
        <View className="gap-2">
          <Text className="text-caption text-center font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {pick("समय", "Time")}
          </Text>
          <View className="flex-row items-center justify-center gap-2">
            <BsNativeSelect
              value={hour12}
              options={hour12Options}
              ariaLabel={pick("घण्टा", "Hour")}
              onChange={(h) => setTime(h, minute, meridiem)}
              minWidth={64}
            />
            <Text className="text-body font-num font-semibold text-muted-foreground">:</Text>
            <BsNativeSelect
              value={minute}
              options={minuteOptions}
              ariaLabel={pick("मिनेट", "Minute")}
              onChange={(m) => setTime(hour12, m, meridiem)}
              minWidth={64}
            />
            <View className="flex-row overflow-hidden rounded-md border border-border">
              {(["AM", "PM"] as const).map((mer) => (
                <Pressable
                  key={mer}
                  onPress={() => setTime(hour12, minute, mer)}
                  className={cn(
                    "px-2.5 py-1.5",
                    meridiem === mer ? "bg-secondary" : "bg-card active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "text-body font-bold",
                      meridiem === mer ? "text-secondary-foreground" : "text-foreground",
                    )}
                  >
                    {mer}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
