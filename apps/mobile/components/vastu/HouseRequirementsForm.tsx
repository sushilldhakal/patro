/**
 * What the house has to contain — bedrooms, wet rooms, extras, storeys.
 *
 * Native counterpart of the web app's
 * `src/components/vastu/HouseRequirementsForm.tsx`, field for field. The web
 * version's `<select>`s become `NativeStringSelect` (a bottom sheet on
 * device), its checkbox becomes a `Pressable` row, and the chip buttons
 * behave the same. Reading the saved plan is async on native, so that lives
 * in `@/lib/vastu-storage` and `PlotPlanner` hydrates from it — this
 * component is controlled, exactly as on web.
 */

import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import type { HousePlan } from "@vedic-patro/domain/vastu-plan";
import { useHouseRequirements } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <View className="min-w-0 flex-1 basis-[45%]">
      <Text
        className={vastuClasses.fieldLabel}
        style={nepaliTextStyle(12)}
      >
        {label}
      </Text>
      <NativeStringSelect
        value={value}
        ariaLabel={label}
        options={options.map((o) => ({ value: o.id, label: o.label }))}
        onChange={onChange}
      />
    </View>
  );
}

/** One toggleable space chip — Essential and Optional rows share it. */
function SpaceChip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={cn(vastuClasses.spaceChip, on ? vastuClasses.spaceChipOn : vastuClasses.spaceChipOff)}
    >
      <Text
        className={cn(
          vastuClasses.spaceChipText,
          on ? vastuClasses.spaceChipTextOn : vastuClasses.spaceChipTextOff,
        )}
        style={nepaliTextStyle(12)}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HouseRequirementsForm({
  plan,
  onChange,
}: {
  plan: HousePlan;
  onChange: (plan: HousePlan) => void;
}) {
  const colors = useThemeColors();
  const v = useHouseRequirements({ plan, onChange });
  const combined = v.combine.checked;

  return (
    <View className="gap-4">
      <View>
        <Text className={vastuClasses.requirementsHeading} style={nepaliTextStyle(14)}>
          {v.copy.heading}
        </Text>
        <Text className={vastuClasses.requirementsBlurb} style={nepaliTextStyle(13)}>
          {v.copy.blurb}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {v.fields.map((f) => (
          <Field key={f.id} label={f.label} value={f.value} options={f.options} onChange={f.onChange} />
        ))}
      </View>

      <View>
        <Text className={vastuClasses.groupLabel} style={nepaliTextStyle(12)}>
          {v.copy.essential}
        </Text>
        <View className={vastuClasses.chipRow}>
          {v.essential.map((chip) => (
            <SpaceChip key={chip.id} label={chip.label} on={chip.on} onPress={chip.toggle} />
          ))}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: combined }}
          onPress={v.combine.toggle}
          className={vastuClasses.checkboxRow}
        >
          <Ionicons
            name={combined ? "checkbox" : "square-outline"}
            size={18}
            color={combined ? colors.secondary : colors.mutedForeground}
          />
          <View className="min-w-0 flex-1">
            <Text className={vastuClasses.checkboxTitle} style={nepaliTextStyle(12)}>
              {v.combine.title}
            </Text>
            <Text className={vastuClasses.checkboxNote} style={nepaliTextStyle(12)}>
              {v.combine.note}
            </Text>
          </View>
        </Pressable>

        <Text className={cn(vastuClasses.groupLabel, "mt-3")} style={nepaliTextStyle(12)}>
          {v.copy.optional}
        </Text>
        <View className={vastuClasses.chipRow}>
          {v.optional.map((chip) => (
            <SpaceChip key={chip.id} label={chip.label} on={chip.on} onPress={chip.toggle} />
          ))}
        </View>
      </View>

      {v.floorFields.length > 0 && (
        <View className="flex-row flex-wrap gap-3">
          {v.floorFields.map((f) => (
            <Field key={f.id} label={f.label} value={f.value} options={f.options} onChange={f.onChange} />
          ))}
        </View>
      )}
    </View>
  );
}

export default HouseRequirementsForm;
