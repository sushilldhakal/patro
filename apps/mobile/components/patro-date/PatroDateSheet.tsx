import { type Era } from "@vedic-patro/domain/era";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SelectOption } from "@/components/ui/BsNativeSelect";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { clampBrowseYear } from "@vedic-patro/domain/patro-browse-range";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import {
  PatroDateSheetDatePanel,
  type PatroDateSheetDraft,
} from "./PatroDateSheetDatePanel";
import { PatroLocationSearchPanel } from "./PatroLocationSearchPanel";
import { patroEraShortLabel } from "./patro-era-labels";
import type { PatroDateNavMode } from "./types";
import type { PatroDateSheetController, PatroSheetTab } from "./use-patro-date-sheet";

type Props = {
  sheet: PatroDateSheetController;
  mode: PatroDateNavMode;
  era: Era;
  year: number;
  month: number;
  day: number;
  clock: string;
  monthOptions: SelectOption[];
  todayAd?: string;
  showTime: boolean;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  onCommit: (draft: PatroDateSheetDraft) => void;
};

export function PatroDateSheet({
  sheet,
  mode,
  era,
  year,
  month,
  day,
  clock,
  monthOptions,
  todayAd,
  showTime,
  location,
  onLocationChange,
  onCommit,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { pick, lang, digits } = useLocale();
  const scrollRef = useRef<ScrollView>(null);
  const [tab, setTab] = useState<PatroSheetTab>("date");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [yearTypingPreview, setYearTypingPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<PatroDateSheetDraft>({
    era,
    year,
    month,
    day,
    clock,
  });

  useEffect(() => {
    if (sheet.open) {
      setTab(sheet.tab);
      setDraft({
        era,
        year: clampBrowseYear(era, year),
        month,
        day,
        clock,
      });
      setYearTypingPreview(null);
      setKeyboardHeight(0);
    }
  }, [sheet.open, sheet.tab, era, year, month, day, clock]);

  useEffect(() => {
    if (sheet.open) setTab(sheet.tab);
  }, [sheet.tab, sheet.open]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dateTitle =
    mode === "year"
      ? pick("वर्ष", "Year")
      : mode === "year-month"
        ? pick("महिना / वर्ष", "Month / year")
        : showTime
          ? pick("मिति र समय", "Date & time")
          : pick("मिति", "Date");

  const headerTitle = tab === "date" ? dateTitle : pick("स्थान छान्नुहोस्", "Choose location");

  const patchDraft = (patch: Partial<PatroDateSheetDraft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (patch.era !== undefined) {
        next.year = clampBrowseYear(next.era, next.year);
      }
      return next;
    });
  };

  const selectTab = (next: PatroSheetTab) => {
    Keyboard.dismiss();
    setYearTypingPreview(null);
    setTab(next);
    sheet.setTab(next);
  };

  const scrollYearIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleDone = () => {
    Keyboard.dismiss();
    if (tab === "date") {
      onCommit({
        ...draft,
        year: clampBrowseYear(draft.era, draft.year),
      });
    }
    sheet.close();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    sheet.close();
  };

  const showYearPreview = tab === "date" && yearTypingPreview !== null && keyboardHeight > 0;
  const previewEraLabel = patroEraShortLabel(draft.era, lang);
  const previewDigits = yearTypingPreview?.replace(/[^\d]/g, "") ?? "";
  const previewDisplay = previewDigits.length > 0 ? digits(previewDigits) : pick("—", "—");

  /** Header + tabs + Done + padding — space to subtract when sizing the location list above the keyboard. */
  const LOCATION_SHEET_CHROME = 210;
  const windowHeight = Dimensions.get("window").height;
  const locationKeyboardLift = tab === "location" && keyboardHeight > 0 ? keyboardHeight : 0;
  const locationSheetMaxHeight =
    locationKeyboardLift > 0
      ? windowHeight - locationKeyboardLift - 8
      : undefined;
  const locationListHeight =
    locationKeyboardLift > 0
      ? Math.max(180, windowHeight - locationKeyboardLift - LOCATION_SHEET_CHROME - Math.max(insets.bottom, 8))
      : 420;

  return (
    <BottomSheetModal
      visible={sheet.open}
      onClose={closeSheet}
      keyboardAvoiding={tab === "date"}
      keyboardInset={locationKeyboardLift}
      maxHeight={
        locationSheetMaxHeight ?? (keyboardHeight > 0 ? "92%" : "88%")
      }
      sheetStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
            <View className="items-center border-b border-border px-4 pb-3 pt-4">
              <Text
                className="text-body font-semibold text-foreground"
                style={lang === "en" ? undefined : nepaliTextStyle(16)}
              >
                {headerTitle}
              </Text>
            </View>

            <View className="flex-row gap-2 px-4 pb-3 pt-3">
              <Pressable
                onPress={() => selectTab("date")}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "date" }}
                className={cn(
                  "h-12 flex-1 items-center justify-center rounded-xl border",
                  tab === "date"
                    ? "border-secondary bg-secondary"
                    : "border-border bg-card active:bg-muted",
                )}
              >
                <Text
                  className={cn(
                    "text-body font-bold",
                    tab === "date" ? "text-secondary-foreground" : "text-foreground",
                  )}
                  style={nepaliTextStyle(14)}
                >
                  {dateTitle}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => selectTab("location")}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "location" }}
                className={cn(
                  "h-12 flex-1 items-center justify-center rounded-xl border",
                  tab === "location"
                    ? "border-secondary bg-secondary"
                    : "border-border bg-card active:bg-muted",
                )}
              >
                <Text
                  className={cn(
                    "text-body font-bold",
                    tab === "location" ? "text-secondary-foreground" : "text-foreground",
                  )}
                  style={nepaliTextStyle(14)}
                >
                  {pick("स्थान", "Location")}
                </Text>
              </Pressable>
            </View>

            {tab === "date" ? (
              <ScrollView
                ref={scrollRef}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: keyboardHeight > 0 ? 360 : mode === "year-month-time" && showTime ? 520 : 420 }}
                contentContainerStyle={{
                  paddingBottom: keyboardHeight > 0 ? 16 : 8,
                }}
              >
                <PatroDateSheetDatePanel
                  mode={mode}
                  draft={draft}
                  onDraftChange={patchDraft}
                  monthOptions={monthOptions}
                  todayAd={todayAd}
                  showTime={showTime}
                  onYearTypingPreviewChange={setYearTypingPreview}
                  onYearInputFocus={scrollYearIntoView}
                />
              </ScrollView>
            ) : (
              <PatroLocationSearchPanel
                embedded
                location={location}
                onLocationChange={onLocationChange}
                listHeight={locationListHeight}
              />
            )}

            {showYearPreview ? (
              <View
                className="border-t border-border bg-muted/80 px-4 py-3"
                accessibilityLiveRegion="polite"
                accessibilityLabel={pick(
                  `टाइप गरिएको वर्ष ${previewDisplay} ${previewEraLabel}`,
                  `Typed year ${previewDisplay} ${previewEraLabel}`,
                )}
              >
                <Text
                  className="text-caption text-center font-medium text-muted-foreground"
                  style={nepaliTextStyle(12)}
                >
                  {pick("वर्ष", "Year")}
                </Text>
                <Text
                  className="text-display text-center font-num font-bold text-foreground"
                  style={nepaliTextStyle(24)}
                >
                  {previewDisplay} {previewEraLabel}
                </Text>
              </View>
            ) : null}

            <View className="border-t border-border px-4 pb-2 pt-3">
              <Pressable
                onPress={handleDone}
                className="h-10 w-full items-center justify-center rounded-lg bg-secondary active:opacity-90"
              >
                <Text className="text-body font-semibold text-secondary-foreground" style={nepaliTextStyle(14)}>
                  {pick("भयो", "Done")}
                </Text>
              </Pressable>
            </View>
    </BottomSheetModal>
  );
}
