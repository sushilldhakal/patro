import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

export type SelectOption = { value: number; label: string };

type SelectProps = {
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  minWidth?: number;
};

function WebSelect({ value, options, onChange, ariaLabel, minWidth = 72 }: SelectProps) {
  const colors = useThemeColors();
  const selected = options.find((o) => o.value === value);

  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        minWidth,
        height: 36,
        alignItems: "center",
        gap: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingLeft: 8,
        paddingRight: 6,
        cursor: "pointer",
      }}
    >
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: colors.foreground,
          pointerEvents: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {selected?.label ?? "—"}
      </span>
      <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
    </label>
  );
}

function AndroidSelect({ value, options, onChange, minWidth = 72 }: SelectProps) {
  const colors = useThemeColors();
  return (
    <View
      className="h-9 justify-center overflow-hidden rounded-lg border border-border bg-card"
      style={{ minWidth }}
    >
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(Number(v))}
        mode="dropdown"
        dropdownIconColor={colors.mutedForeground}
        style={{ height: 36, marginTop: -4, marginBottom: -4 }}
      >
        {options.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
        ))}
      </Picker>
    </View>
  );
}

type MonthYearProps = {
  month: number;
  year: number;
  monthOptions: SelectOption[];
  yearOptions: SelectOption[];
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  monthMinWidth?: number;
  yearMinWidth?: number;
};

/** Inline month + year selects on web/Android; iOS opens one bottom sheet with both wheels. */
export function BsMonthYearNav({
  month,
  year,
  monthOptions,
  yearOptions,
  onMonthChange,
  onYearChange,
  monthMinWidth = 88,
  yearMinWidth = 72,
}: MonthYearProps) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftYear, setDraftYear] = useState(year);

  useEffect(() => {
    if (!open) {
      setDraftMonth(month);
      setDraftYear(year);
    }
  }, [month, year, open]);

  if (Platform.OS === "web") {
    return (
      <View className="flex-row items-center gap-1">
        <WebSelect
          value={month}
          options={monthOptions}
          onChange={onMonthChange}
          ariaLabel={pick("महिना", "Month")}
          minWidth={monthMinWidth}
        />
        <WebSelect
          value={year}
          options={yearOptions}
          onChange={onYearChange}
          ariaLabel={pick("वर्ष", "Year")}
          minWidth={yearMinWidth}
        />
      </View>
    );
  }

  if (Platform.OS === "android") {
    return (
      <View className="flex-row items-center gap-1">
        <AndroidSelect
          value={month}
          options={monthOptions}
          onChange={onMonthChange}
          ariaLabel={pick("महिना", "Month")}
          minWidth={monthMinWidth}
        />
        <AndroidSelect
          value={year}
          options={yearOptions}
          onChange={onYearChange}
          ariaLabel={pick("वर्ष", "Year")}
          minWidth={yearMinWidth}
        />
      </View>
    );
  }

  const monthLabel = monthOptions.find((o) => o.value === month)?.label ?? "—";
  const yearLabel = yearOptions.find((o) => o.value === year)?.label ?? "—";

  const sheetStyle: ViewStyle = isTablet
    ? {
        alignSelf: "center",
        width: "100%",
        maxWidth: 420,
        marginHorizontal: 24,
        borderRadius: 16,
        overflow: "hidden",
      }
    : {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: "hidden",
      };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={pick("मिति बदल्नुहोस्", "Change date")}
        className="h-[30px] flex-row items-center gap-1 rounded-lg border border-border bg-card px-2.5 active:bg-muted"
      >
        <Text numberOfLines={1} className="text-body font-semibold text-foreground">
          {monthLabel}
        </Text>
        <Text className="text-body font-num font-semibold text-foreground">{yearLabel}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        variant={isTablet ? "center" : "bottom"}
        maxHeight={isTablet ? "80%" : undefined}
        sheetStyle={{ ...sheetStyle, backgroundColor: colors.card, overflow: "hidden" }}
      >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable onPress={() => setOpen(false)} hitSlop={8} style={{ minWidth: 72 }}>
                <Text style={{ fontSize: 18, color: colors.mutedForeground }}>
                  {pick("रद्द", "Cancel")}
                </Text>
              </Pressable>
              <Text
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.foreground,
                }}
              >
                {pick("मिति", "Date")}
              </Text>
              <Pressable
                onPress={() => {
                  onMonthChange(draftMonth);
                  onYearChange(draftYear);
                  setOpen(false);
                }}
                hitSlop={8}
                style={{ minWidth: 72, alignItems: "flex-end" }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>
                  {pick("भयो", "Done")}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row" }}>
              <Picker
                selectedValue={draftMonth}
                onValueChange={(v) => setDraftMonth(Number(v))}
                style={{ flex: 1, height: 216 }}
              >
                {monthOptions.map((o) => (
                  <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
                ))}
              </Picker>
              <Picker
                selectedValue={draftYear}
                onValueChange={(v) => setDraftYear(Number(v))}
                style={{ flex: 1, height: 216 }}
              >
                {yearOptions.map((o) => (
                  <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
                ))}
              </Picker>
            </View>

            <View style={{ height: Math.max(insets.bottom, 8) }} />
      </BottomSheetModal>
    </>
  );
}

/** Generic native select — web uses HTML select, Android dropdown, iOS wheel sheet. */
export function BsNativeSelect(props: SelectProps & { className?: string }) {
  const colors = useThemeColors();
  const { className, ...rest } = props;
  const { pick } = useLocale();
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(rest.value);
  const selected = rest.options.find((o) => o.value === rest.value);

  useEffect(() => {
    if (!open) setDraft(rest.value);
  }, [rest.value, open]);

  if (Platform.OS === "web") {
    return <WebSelect {...rest} />;
  }

  if (Platform.OS === "android") {
    return <AndroidSelect {...rest} />;
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(rest.value);
          setOpen(true);
        }}
        accessibilityLabel={rest.ariaLabel}
        className={cn(
          "h-[30px] flex-row items-center gap-0.5 rounded-lg border border-border bg-card px-2 active:bg-muted",
          className,
        )}
        style={{ minWidth: rest.minWidth ?? 72 }}
      >
        <Text numberOfLines={1} className="text-body min-w-0 flex-1 font-semibold text-foreground">
          {selected?.label ?? "—"}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        variant={isTablet ? "center" : "bottom"}
        maxHeight={isTablet ? "80%" : undefined}
        sheetStyle={{
          backgroundColor: colors.card,
          ...(isTablet
            ? { borderWidth: 1, borderColor: colors.border }
            : { borderTopLeftRadius: 16, borderTopRightRadius: 16 }),
        }}
      >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable onPress={() => setOpen(false)} style={{ minWidth: 72 }}>
                <Text style={{ fontSize: 18, color: colors.mutedForeground }}>
                  {pick("रद्द", "Cancel")}
                </Text>
              </Pressable>
              <Text
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.foreground,
                }}
              >
                {rest.ariaLabel}
              </Text>
              <Pressable
                onPress={() => {
                  rest.onChange(draft);
                  setOpen(false);
                }}
                style={{ minWidth: 72, alignItems: "flex-end" }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>
                  {pick("भयो", "Done")}
                </Text>
              </Pressable>
            </View>
            <Picker selectedValue={draft} onValueChange={(v) => setDraft(Number(v))} style={{ height: 216 }}>
              {rest.options.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
              ))}
            </Picker>
            <View style={{ height: Math.max(insets.bottom, 8) }} />
      </BottomSheetModal>
    </>
  );
}

export type BsNativeSelectOption = SelectOption;
