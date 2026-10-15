/**
 * Does the owner's own नक्षत्र suit the day they mean to start building?
 *
 * Native counterpart of the web app's
 * `src/components/vastu/OwnerCompatibility.tsx`: pick a saved profile, pick a
 * candidate date and place, and read that day's ताराबल row for the owner's
 * birth nakshatra. The web version's `<input type="date">` becomes three
 * `NativeStringSelect`s, which is how the rest of this app asks for an option
 * on device; everything else — the two queries, the 0-based index conversion,
 * the tone colouring — is the same.
 */

import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { fetchPanchanga } from "@/lib/api";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { useThemeColors } from "@/lib/theme-context";
import { useOwnerCompatibility, type FetchCivilDay } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

const fetchDay: FetchCivilDay = (dateAd, location) => fetchPanchanga(dateAd, "ad", location);

export function OwnerCompatibility() {
  const colors = useThemeColors();
  const v = useOwnerCompatibility({ fetchDay });
  const date = v.dateParts;

  return (
    <View className={vastuClasses.ownerCard}>
      <View className={vastuClasses.ownerHeader}>
        <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
        <Text className={vastuClasses.ownerHeading} style={nepaliTextStyle(14)}>
          {v.copy.heading}
        </Text>
      </View>

      <View className={vastuClasses.ownerBody}>
        <Text className={cn(vastuClasses.planBlurb, "text-foreground")} style={nepaliTextStyle(13)}>
          {v.copy.blurb}
        </Text>

        <SaitProfilePicker selectedId={v.selectedProfile?.id ?? null} onSelect={v.setSelectedProfile} />

        {v.hasProfile && (
          <>
            <View className="gap-3">
              <View>
                <Text className={vastuClasses.fieldLabel} style={nepaliTextStyle(12)}>
                  {v.copy.dateLabel}
                </Text>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <NativeStringSelect
                      value={date.year}
                      options={date.yearOptions}
                      ariaLabel={v.copy.dateLabel}
                      onChange={date.setYear}
                    />
                  </View>
                  <View className="flex-[1.4]">
                    <NativeStringSelect
                      value={date.month}
                      options={date.monthOptions}
                      ariaLabel={v.copy.dateLabel}
                      onChange={date.setMonth}
                    />
                  </View>
                  <View className="flex-1">
                    <NativeStringSelect
                      value={date.day}
                      options={date.dayOptions}
                      ariaLabel={v.copy.dateLabel}
                      onChange={date.setDay}
                    />
                  </View>
                </View>
              </View>
              <View>
                <Text className={vastuClasses.fieldLabel} style={nepaliTextStyle(12)}>
                  {v.copy.placeLabel}
                </Text>
                <PatroHeaderLocation location={v.plotLocation} onLocationChange={v.setPlotLocation} />
              </View>
            </View>

            {v.status && (
              <Text className={vastuClasses.mutedNote} style={nepaliTextStyle(13)}>
                {v.status}
              </Text>
            )}
            {v.error && (
              <Text className={vastuClasses.destructiveText} style={nepaliTextStyle(13)}>
                {v.error}
              </Text>
            )}

            {v.result && (
              <View className={cn(vastuClasses.ownerResult, patroNavataraToneBg(v.result.tone))}>
                <Text className={vastuClasses.ownerResultTitle} style={nepaliTextStyle(13)}>
                  {v.result.title}
                </Text>
                <Text className={cn(vastuClasses.ownerResultVerdict, "text-foreground")} style={nepaliTextStyle(13)}>
                  {v.result.verdict}
                </Text>
                <Text className={vastuClasses.infoDisclaimer} style={nepaliTextStyle(13)}>
                  {v.result.disclaimer}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default OwnerCompatibility;
