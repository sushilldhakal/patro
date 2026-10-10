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
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { normalizeExtras } from "@/lib/vastu-storage";
import {
  ESSENTIAL_SPACES,
  FLOOR_SPACES,
  OPTIONAL_SPACES,
  clampStoreys,
  type FloorPref,
  type HousePlan,
  type SpaceKind,
  type VastuMode,
} from "@vedic-patro/domain/vastu-plan";
import { cn } from "@vedic-patro/domain/utils";

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
        className="text-caption mb-1 font-semibold text-muted-foreground"
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
      className={cn(
        "rounded-md border px-2 py-1",
        on ? "border-transparent bg-secondary" : "border-border",
      )}
    >
      <Text
        className={cn(
          "text-caption font-semibold",
          on ? "text-secondary-foreground" : "text-muted-foreground",
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
  const { t, digits } = useLocale();
  const colors = useThemeColors();

  function commit(next: HousePlan) {
    const masterBedroom = Math.min(next.masterBedroom, next.bedrooms);
    onChange({ ...next, masterBedroom, extras: normalizeExtras(next.extras) });
  }

  function toggleExtra(id: SpaceKind) {
    const adding = !plan.extras.includes(id);
    const extras = adding ? [...plan.extras, id] : plan.extras.filter((x) => x !== id);
    // A staircase with nothing to climb to is never actually built — see
    // vastu-plan's wantStair. Checking it while on a single storey must bump
    // storeys, not silently no-op.
    const storeys = adding && id === "staircase" && plan.storeys === 1 ? 2 : plan.storeys;
    commit({ ...plan, extras, storeys });
  }

  // kitchen_dining is mutually exclusive with separate kitchen+dining — one dedicated
  // checkbox swaps between the two rather than living alongside them as a third,
  // independently-toggleable extra.
  const combineKitchenDining = plan.extras.includes("kitchen_dining");
  function toggleKitchenDining() {
    const extras: SpaceKind[] = combineKitchenDining
      ? [...plan.extras.filter((x) => x !== "kitchen_dining"), "kitchen", "dining"]
      : [...plan.extras.filter((x) => x !== "kitchen" && x !== "dining"), "kitchen_dining"];
    commit({ ...plan, extras });
  }

  const counts = (min: number, max: number) =>
    Array.from({ length: max - min + 1 }, (_, i) => {
      const n = min + i;
      return { id: String(n), label: digits(n) };
    });

  const storeys = clampStoreys(plan.storeys);
  const floorChoices: FloorPref[] =
    storeys >= 3
      ? ["any", "ground", "first", "third"]
      : storeys === 2
        ? ["any", "ground", "first"]
        : ["any", "ground"];
  const floorFields = FLOOR_SPACES.filter((id) => id === "master_bedroom" || plan.extras.includes(id));

  return (
    <View className="gap-4">
      <View>
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {t("vastu.plan.requirements_heading")}
        </Text>
        <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
          {t("vastu.plan.requirements_blurb")}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <Field
          label={t("vastu.plan.bedrooms")}
          value={String(plan.bedrooms)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, bedrooms: Number(v) })}
        />
        <Field
          label={t("vastu.plan.master_bedroom")}
          value={String(plan.masterBedroom)}
          options={Array.from({ length: plan.bedrooms }, (_, i) => ({
            id: String(i + 1),
            label: t("vastu.plan.bedroom_n", { n: digits(i + 1) }),
          }))}
          onChange={(v) => commit({ ...plan, masterBedroom: Number(v) })}
        />
        <Field
          label={t("vastu.plan.toilets")}
          value={String(plan.toilets)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, toilets: Number(v) })}
        />
        <Field
          label={t("vastu.plan.bathrooms")}
          value={String(plan.bathrooms)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, bathrooms: Number(v) })}
        />
        <Field
          label={t("vastu.plan.combined")}
          value={String(plan.combined)}
          options={counts(0, 5)}
          onChange={(v) => commit({ ...plan, combined: Number(v) })}
        />
        <Field
          label={t("vastu.plan.mode_label")}
          value={plan.mode}
          options={(["flexible", "strict"] as VastuMode[]).map((mode) => ({
            id: mode,
            label: t(`vastu.plan.mode.${mode}`),
          }))}
          onChange={(v) => commit({ ...plan, mode: v as VastuMode })}
        />
        <Field
          label={t("vastu.plan.storeys")}
          value={String(storeys)}
          options={[1, 2, 3].map((n) => ({
            id: String(n),
            label: t(`vastu.plan.storeys_${n}`),
          }))}
          onChange={(v) => commit({ ...plan, storeys: clampStoreys(Number(v)) })}
        />
      </View>

      <View>
        <Text
          className="text-caption mb-2 font-semibold text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {t("vastu.plan.essential")}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {ESSENTIAL_SPACES.map((id) => (
            <SpaceChip
              key={id}
              label={t(`vastu.plan.space.${id}`)}
              on={plan.extras.includes(id)}
              onPress={() => toggleExtra(id)}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: combineKitchenDining }}
          onPress={toggleKitchenDining}
          className="mt-3 flex-row items-start gap-2 rounded-lg border border-border p-2.5"
        >
          <Ionicons
            name={combineKitchenDining ? "checkbox" : "square-outline"}
            size={18}
            color={combineKitchenDining ? colors.secondary : colors.mutedForeground}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(12)}>
              {t("vastu.plan.combine_kitchen_dining")}
            </Text>
            <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("vastu.plan.combine_kitchen_dining_note")}
            </Text>
          </View>
        </Pressable>

        <Text
          className="text-caption mb-2 mt-3 font-semibold text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {t("vastu.plan.optional")}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {OPTIONAL_SPACES.map((id) => (
            <SpaceChip
              key={id}
              label={t(`vastu.plan.space.${id}`)}
              on={plan.extras.includes(id)}
              onPress={() => toggleExtra(id)}
            />
          ))}
        </View>
      </View>

      {storeys > 1 && floorFields.length > 0 && (
        <View className="flex-row flex-wrap gap-3">
          {floorFields.map((id) => {
            const value = plan.floors?.[id] ?? "any";
            const safe = floorChoices.includes(value) ? value : "any";
            return (
              <Field
                key={id}
                label={`${t(`vastu.plan.space.${id}`)} · ${t("vastu.plan.floor_heading")}`}
                value={safe}
                options={floorChoices.map((floor) => ({
                  id: floor,
                  label: t(`vastu.plan.floor.${floor}`),
                }))}
                onChange={(v) => commit({ ...plan, floors: { ...plan.floors, [id]: v as FloorPref } })}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

export default HouseRequirementsForm;
