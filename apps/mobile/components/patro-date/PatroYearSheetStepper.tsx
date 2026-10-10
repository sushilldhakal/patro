import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  browseYearSelectOptions,
  clampBrowseYear,
  isValidBrowseYear,
  maxBrowseYearForEra,
} from "@/lib/patro-browse-years";
import { toggleEraForLanguage, type Era } from "@vedic-patro/domain/era";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { patroEraShortLabel } from "./patro-era-labels";

const YEAR_ROW_HEIGHT = 44;
/** Max height for manual pin + scrollable years (below modal title bar). */
const YEAR_PICKER_BODY_MAX = 360;
/** Pinned “Enter manually” + range hint — always visible; list height excludes this. */
const YEAR_MANUAL_PIN_HEIGHT = 92;
const YEAR_LIST_SCROLL_HEIGHT = YEAR_PICKER_BODY_MAX - YEAR_MANUAL_PIN_HEIGHT;

type YearOption = { value: number; label: string };

const YEAR_MANUAL_INPUT_ACCESSORY_ID = "patro-year-manual-input-accessory";

type Props = {
  era: Era;
  year: number;
  onEraChange: (era: Era) => void;
  onYearChange: (year: number) => void;
  onYearTypingPreviewChange?: (preview: string | null) => void;
  onYearInputFocus?: () => void;
};

/** Sheet year controls — dropdown list + “Enter manually”, with ± steppers (web popover parity). */
export function PatroYearSheetStepper({
  era,
  year,
  onEraChange,
  onYearChange,
  onYearTypingPreviewChange,
  onYearInputFocus,
}: Props) {
  const colors = useThemeColors();
  const { pick, lang, digits } = useLocale();
  const clamped = clampBrowseYear(era, year);
  const yearMin = 1;
  const yearMax = maxBrowseYearForEra(era);
  const yearOptions = useMemo(
    () => browseYearSelectOptions(era, clamped, digits),
    [era, clamped, digits],
  );
  const yearWindowStart = yearOptions[0]?.value ?? clamped;
  const yearWindowEnd = yearOptions[yearOptions.length - 1]?.value ?? clamped;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState(String(clamped));

  const listRef = useRef<FlatList<YearOption>>(null);
  const selectedIndex = useMemo(
    () => yearOptions.findIndex((o) => o.value === clamped),
    [yearOptions, clamped],
  );

  const centerSelectedYear = useCallback(() => {
    if (selectedIndex < 0) return;
    listRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: false,
      viewPosition: 0.5,
    });
  }, [selectedIndex]);

  const scrollToSelectedOffset = useCallback(() => {
    if (selectedIndex < 0) return;
    const y =
      selectedIndex * YEAR_ROW_HEIGHT -
      YEAR_LIST_SCROLL_HEIGHT / 2 +
      YEAR_ROW_HEIGHT / 2;
    listRef.current?.scrollToOffset({ offset: Math.max(0, y), animated: false });
  }, [selectedIndex]);

  useEffect(() => {
    if (!pickerOpen || manualMode || selectedIndex < 0) return;
    scrollToSelectedOffset();
    const t = setTimeout(() => {
      centerSelectedYear();
      scrollToSelectedOffset();
    }, 150);
    return () => clearTimeout(t);
  }, [
    pickerOpen,
    manualMode,
    selectedIndex,
    centerSelectedYear,
    scrollToSelectedOffset,
    era,
    clamped,
  ]);

  useEffect(() => {
    if (!pickerOpen) {
      setManualMode(false);
      setManualText(String(clamped));
    }
  }, [pickerOpen, clamped]);

  const switchEra = () => {
    const next = toggleEraForLanguage(era, lang);
    onEraChange(next);
    onYearChange(clampBrowseYear(next, year));
  };

  const stepYear = (delta: -1 | 1) => {
    onYearChange(clampBrowseYear(era, clamped + delta));
  };

  const pickYear = (y: number) => {
    onYearChange(clampBrowseYear(era, y));
    setPickerOpen(false);
    Keyboard.dismiss();
  };

  const commitManual = () => {
    const raw = manualText.replace(/[^\d]/g, "");
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      setManualText(String(clamped));
      return;
    }
    const next = isValidBrowseYear(era, n) ? n : clampBrowseYear(era, n);
    onYearChange(next);
    setManualText(String(next));
    setPickerOpen(false);
    Keyboard.dismiss();
    onYearTypingPreviewChange?.(null);
  };

  const openPicker = () => {
    setManualText(String(clamped));
    setManualMode(false);
    setPickerOpen(true);
  };

  const startManual = () => {
    setManualMode(true);
    onYearInputFocus?.();
    requestAnimationFrame(() => {
      onYearTypingPreviewChange?.(manualText);
    });
  };

  const targetEra = toggleEraForLanguage(era, lang);
  const targetLabel = patroEraShortLabel(targetEra, pick);
  const manualLabel = pick("हातले लेख्नुहोस्", "Enter manually");
  const eraShort = patroEraShortLabel(era, pick);
  const rangeHint = pick(
    `${digits(yearWindowStart)}–${digits(yearWindowEnd)} (${digits(clamped)} छानिएको)`,
    `${yearWindowStart}–${yearWindowEnd} (${clamped} selected)`,
  );

  const manualPin = (
    <View
      className="border-b border-border bg-card"
      style={{ height: YEAR_MANUAL_PIN_HEIGHT, flexShrink: 0 }}
    >
      <Pressable
        onPress={startManual}
        className="mx-2 mt-2 flex-row items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 active:bg-muted"
      >
        <Ionicons name="keypad-outline" size={18} color={colors.secondary} />
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {manualLabel}
        </Text>
      </Pressable>
      <Text
        className="text-caption mt-1.5 px-4 text-center text-muted-foreground"
        numberOfLines={1}
        style={nepaliTextStyle(11)}
      >
        {rangeHint}
      </Text>
    </View>
  );

  return (
    <View className="gap-3">
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={YEAR_MANUAL_INPUT_ACCESSORY_ID}>
          <View
            className="flex-row items-center justify-end border-t border-border bg-card px-4"
            style={{ height: 44 }}
          >
            <Pressable onPress={commitManual} hitSlop={8}>
              <Text className="text-body font-semibold text-primary" style={nepaliTextStyle(16)}>
                {pick("भयो", "Done")}
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      <Pressable
        onPress={switchEra}
        className="flex-row items-center justify-center rounded-md border border-border bg-card px-3 py-2.5 active:bg-muted"
      >
        <Text className="text-caption font-semibold text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick(`${targetLabel} मा जानुहोस्`, `Switch to ${targetLabel}`)}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-2">
        <Pressable
          onPress={() => stepYear(-1)}
          disabled={clamped <= yearMin}
          className={cn(
            "h-9 w-9 items-center justify-center rounded-lg border border-border bg-card active:bg-muted",
            clamped <= yearMin && "opacity-40",
          )}
        >
          <Ionicons name="remove" size={20} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={openPicker}
          accessibilityLabel={pick("वर्ष छान्नुहोस्", "Choose year")}
          className="h-9 min-w-[7.5rem] flex-1 flex-row items-center justify-center gap-1 rounded-md border border-border bg-card px-2 active:bg-muted"
        >
          <Text className="text-body font-num font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {digits(clamped)}
          </Text>
          <Text className="text-caption font-medium text-muted-foreground">{eraShort}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          onPress={() => stepYear(1)}
          disabled={clamped >= yearMax}
          className={cn(
            "h-9 w-9 items-center justify-center rounded-lg border border-border bg-card active:bg-muted",
            clamped >= yearMax && "opacity-40",
          )}
        >
          <Ionicons name="add" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <BottomSheetModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        keyboardAvoiding
        maxHeight="70%"
        sheetStyle={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Text className="text-body text-muted-foreground">{pick("रद्द", "Cancel")}</Text>
              </Pressable>
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(16)}>
                {pick("वर्ष", "Year")}
              </Text>
              <Pressable
                onPress={manualMode ? commitManual : () => setPickerOpen(false)}
                hitSlop={8}
              >
                <Text className="text-body font-semibold text-primary">
                  {manualMode ? pick("भयो", "Done") : " "}
                </Text>
              </Pressable>
            </View>

            {manualMode ? (
              <View className="gap-3 px-4 py-4">
                <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                  {pick("वर्ष नम्बर टाइप गर्नुहोस्", "Type the year number")}
                </Text>
                <TextInput
                  value={manualText}
                  onChangeText={(next) => {
                    setManualText(next);
                    onYearTypingPreviewChange?.(next);
                  }}
                  onFocus={() => onYearInputFocus?.()}
                  autoFocus
                  keyboardType="number-pad"
                  inputAccessoryViewID={
                    Platform.OS === "ios" ? YEAR_MANUAL_INPUT_ACCESSORY_ID : undefined
                  }
                  onSubmitEditing={commitManual}
                  className="text-title h-12 rounded-md border border-border bg-card px-3 text-center font-num font-bold text-foreground"
                  style={[
                    { color: colors.foreground, borderColor: colors.border },
                    nepaliTextStyle(20),
                  ]}
                  placeholder={pick("जस्तै २०८२", "e.g. 2082")}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ) : (
              <View style={{ maxHeight: YEAR_PICKER_BODY_MAX }}>
                {manualPin}
                <FlatList
                  ref={listRef}
                  data={yearOptions}
                  keyExtractor={(item) => String(item.value)}
                  keyboardShouldPersistTaps="handled"
                  style={{ height: YEAR_LIST_SCROLL_HEIGHT, flexGrow: 0 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  initialNumToRender={24}
                  maxToRenderPerBatch={32}
                  windowSize={11}
                  getItemLayout={(_data, index) => ({
                    length: YEAR_ROW_HEIGHT,
                    offset: YEAR_ROW_HEIGHT * index,
                    index,
                  })}
                  onScrollToIndexFailed={() => {
                    scrollToSelectedOffset();
                    setTimeout(centerSelectedYear, 50);
                  }}
                  onLayout={() => {
                    if (pickerOpen && !manualMode) scrollToSelectedOffset();
                  }}
                  renderItem={({ item }) => {
                    const selected = item.value === clamped;
                    return (
                      <Pressable
                        onPress={() => pickYear(item.value)}
                        style={{ height: YEAR_ROW_HEIGHT }}
                        className={cn(
                          "mx-2 justify-center rounded-lg px-3",
                          selected ? "bg-secondary" : "active:bg-muted",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-body text-center font-num font-semibold",
                            selected ? "text-secondary-foreground" : "text-foreground",
                          )}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            )}
      </BottomSheetModal>
    </View>
  );
}
