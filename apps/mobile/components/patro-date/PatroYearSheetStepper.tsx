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
import { browseYearSelectOptions } from "@/lib/patro-browse-years";
import { clampBrowseYear, maxBrowseYearForEraOrDefault as maxBrowseYearForEra } from "@vedic-patro/domain/patro-browse-range";
import { isValidBrowseYear } from "@vedic-patro/domain/patro-year-axis";
import { toggleEraForLanguage, type Era } from "@vedic-patro/domain/era";
import { useThemeColors } from "@/lib/theme-context";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
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
  const { t, pick, lang, digits } = useLocale();
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
  const targetLabel = patroEraShortLabel(targetEra, lang);
  const manualLabel = t("ui.patro_date.enter_manually");
  const eraShort = patroEraShortLabel(era, lang);
  const rangeHint = pick(
    `${digits(yearWindowStart)}–${digits(yearWindowEnd)} (${digits(clamped)} छानिएको)`,
    `${yearWindowStart}–${yearWindowEnd} (${clamped} selected)`,
  );

  const manualPin = (
    <View
      className={patroDateClasses.stepperPin}
      style={{ height: YEAR_MANUAL_PIN_HEIGHT, flexShrink: 0 }}
    >
      <Pressable
        onPress={startManual}
        className={cn("flex-row", patroDateClasses.stepperManual, "active:bg-muted")}
      >
        <Ionicons name="keypad-outline" size={18} color={colors.secondary} />
        <Text className={patroDateClasses.stepperManualLabel} style={nepaliTextStyle(14)}>
          {manualLabel}
        </Text>
      </Pressable>
      <Text
        className={patroDateClasses.stepperHint}
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
            className={cn("flex-row", patroDateClasses.stepperAccessory)}
            style={{ height: 44 }}
          >
            <Pressable onPress={commitManual} hitSlop={8}>
              <Text className={patroDateClasses.stepperDone} style={nepaliTextStyle(16)}>
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      <Pressable
        onPress={switchEra}
        className={cn("flex-row", patroDateClasses.stepperSwitch, "active:bg-muted")}
      >
        <Text className={patroDateClasses.stepperSwitchLabel} style={nepaliTextStyle(12)}>
          {t("ui.patro_date.switch_to_targetlabel", { targetLabel })}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-2">
        <Pressable
          onPress={() => stepYear(-1)}
          disabled={clamped <= yearMin}
          className={cn(
            patroDateClasses.stepperStep,
            "active:bg-muted",
            clamped <= yearMin && "opacity-40",
          )}
        >
          <Ionicons name="remove" size={20} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={openPicker}
          accessibilityLabel={t("ui.patro_date.choose_year")}
          className={cn("flex-row", patroDateClasses.stepperValue, "active:bg-muted")}
        >
          <Text className={patroDateClasses.stepperValueText} style={nepaliTextStyle(16)}>
            {digits(clamped)}
          </Text>
          <Text className={patroDateClasses.stepperEra}>{eraShort}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          onPress={() => stepYear(1)}
          disabled={clamped >= yearMax}
          className={cn(
            patroDateClasses.stepperStep,
            "active:bg-muted",
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
            <View className={cn("flex-row", patroDateClasses.sheetHead)}>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Text className={patroDateClasses.sheetCancel}>{t("common.cancel")}</Text>
              </Pressable>
              <Text className={patroDateClasses.sheetTitle} style={nepaliTextStyle(16)}>
                {t("common.year")}
              </Text>
              <Pressable
                onPress={manualMode ? commitManual : () => setPickerOpen(false)}
                hitSlop={8}
              >
                <Text className={patroDateClasses.stepperDone}>
                  {manualMode ? t("common.done") : " "}
                </Text>
              </Pressable>
            </View>

            {manualMode ? (
              <View className={patroDateClasses.manualBody}>
                <Text className={patroDateClasses.manualHint} style={nepaliTextStyle(14)}>
                  {t("ui.patro_date.type_the_year_number")}
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
                  className={patroDateClasses.manualInput}
                  style={[
                    { color: colors.foreground, borderColor: colors.border },
                    nepaliTextStyle(20),
                  ]}
                  placeholder={t("ui.patro_date.e_g_2082")}
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
                  contentContainerClassName="pb-4"
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
                          patroDateClasses.yearRow,
                          selected ? patroDateClasses.yearRowActive : "active:bg-muted",
                        )}
                      >
                        <Text
                          className={cn(
                            patroDateClasses.yearRowText,
                            selected ? patroDateClasses.yearRowTextActive : patroDateClasses.yearRowTextIdle,
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
