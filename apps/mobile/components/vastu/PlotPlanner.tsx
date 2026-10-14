/**
 * The plot, the house requirements, and the sketch they produce.
 *
 * Native counterpart of the web app's
 * `src/components/vastu/PlotPlanner.tsx` — same inputs, same Āyādi panel,
 * same per-storey sketches. Two differences, both forced by the platform:
 * the saved plot/plan arrive asynchronously from `@/lib/vastu-storage` (so
 * the first frame shows the defaults and is replaced once storage answers),
 * and the sketch needs an explicit pixel size where the web version simply
 * fills its container.
 */

import { TextInput, View } from "react-native";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import type { CardinalWall } from "@vedic-patro/domain/vastu";
import { usePlotPlanner } from "@vedic-patro/features/vastu";
import { vastuStorage } from "@/lib/vastu-storage";
import { localVastuSketch } from "@/lib/vastu-offline";
import { HouseRequirementsForm } from "./HouseRequirementsForm";
import { HouseSketch } from "./HouseSketch";
import { OwnerCompatibility } from "./OwnerCompatibility";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

/** Widest the sketch is ever drawn, matching the web copy's max-w-[900px]. */
const MAX_SKETCH = 900;
/** Page padding + card padding the sketch sits inside. */
const SKETCH_CHROME = 56;

function DimensionInput({
  label,
  value,
  onChangeText,
  invalid,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  invalid: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="min-w-0 flex-1">
      <Text className={vastuClasses.fieldLabel} style={nepaliTextStyle(12)}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          "text-body rounded-lg border bg-card px-3 py-2.5 text-foreground",
          invalid ? "border-danger" : "border-border",
        )}
        style={nepaliTextStyle(14)}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className={vastuClasses.infoRow}>
      <Text className={vastuClasses.infoLabel} style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className="text-body shrink text-right text-foreground" style={nepaliTextStyle(13)}>
        {value}
      </Text>
    </View>
  );
}

export function PlotPlanner() {
  const { width, isTablet } = useBreakpoint();
  const v = usePlotPlanner({ storage: vastuStorage, offline: localVastuSketch });
  const { copy, plot, errors } = v;
  /* iPad: 10% under the full size. */
  const sketchSize = Math.round(Math.min(MAX_SKETCH, Math.max(240, width - SKETCH_CHROME)) * (isTablet ? 0.9 : 1));

  return (
    <View className={cn(vastuClasses.section, "overflow-hidden")}>
      <View className={vastuClasses.sectionHeader}>
        <Text className={vastuClasses.sectionHeading} style={nepaliTextStyle(14)}>
          {copy.heading}
        </Text>
      </View>

      <View className={vastuClasses.plotBody}>
        <Text className={cn(vastuClasses.planBlurb, "text-foreground")} style={nepaliTextStyle(13)}>
          {copy.blurb}
        </Text>

        <OwnerCompatibility />

        <View className="flex-row gap-3">
          <DimensionInput
            label={copy.lengthLabel}
            value={plot.length}
            onChangeText={(text) => v.update({ length: text })}
            invalid={errors.length}
          />
          <DimensionInput
            label={copy.breadthLabel}
            value={plot.breadth}
            onChangeText={(text) => v.update({ breadth: text })}
            invalid={errors.breadth}
          />
        </View>

        <View>
          <Text className={vastuClasses.fieldLabel} style={nepaliTextStyle(12)}>
            {copy.facingLabel}
          </Text>
          <NativeStringSelect
            value={plot.facing}
            ariaLabel={copy.facingLabel}
            options={v.facingOptions}
            onChange={(value) => v.update({ facing: value as CardinalWall })}
          />
        </View>

        {copy.rangeError && (
          <Text className={vastuClasses.destructiveText} style={nepaliTextStyle(13)}>
            {copy.rangeError}
          </Text>
        )}

        <HouseRequirementsForm plan={v.house} onChange={v.updateHouse} />

        <View className={vastuClasses.layoutCard}>
          <Text className={vastuClasses.layoutHeading} style={nepaliTextStyle(15)}>
            {copy.layoutHeading}
          </Text>
          <Text className={vastuClasses.layoutBlurb} style={nepaliTextStyle(13)}>
            {copy.layoutBlurb}
          </Text>

          {copy.sketchStatus && (
            <Text className={vastuClasses.layoutStatus} style={nepaliTextStyle(13)}>
              {copy.sketchStatus}
            </Text>
          )}

          {v.cannotFit && (
            <View className={vastuClasses.cannotFit}>
              <Text className={vastuClasses.cannotFitHeading} style={nepaliTextStyle(13)}>
                {v.cannotFit.heading}
              </Text>
              <Text className={vastuClasses.cannotFitBlurb} style={nepaliTextStyle(13)}>
                {v.cannotFit.blurb}
              </Text>
              <View className={vastuClasses.cannotFitList}>
                {v.cannotFit.items.map((item) => (
                  <View key={item.id} className={vastuClasses.cannotFitItem}>
                    <Text className={vastuClasses.cannotFitItemText} style={nepaliTextStyle(12)}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className={vastuClasses.storeyList}>
            {v.storeys.map((s) => (
              <View key={s.storey} className="min-w-0">
                {s.title && (
                  <Text className={vastuClasses.storeyTitle} style={nepaliTextStyle(13)}>
                    {s.title}
                  </Text>
                )}
                <HouseSketch size={sketchSize} plot={v.footprint} facing={plot.facing} assignments={s.assignments} />
              </View>
            ))}
          </View>

          <Text className={vastuClasses.mutedNoteTop} style={nepaliTextStyle(13)}>
            {copy.disclaimer}
          </Text>
          <Text className={vastuClasses.mutedNoteTop} style={nepaliTextStyle(13)}>
            {copy.bufferNote}
          </Text>
          <Text className={vastuClasses.mutedNote} style={nepaliTextStyle(13)}>
            {copy.marmaNote}
          </Text>
        </View>

        {v.ayadiCard && v.entranceCard && (
          <View className="gap-3">
            <View className={vastuClasses.infoCard}>
              <Text className={vastuClasses.infoHeading} style={nepaliTextStyle(14)}>
                {v.ayadiCard.heading}
              </Text>
              <View className={vastuClasses.infoRows}>
                {v.ayadiCard.rows.map((row) => (
                  <InfoRow key={row.key} label={row.label} value={row.value} />
                ))}
              </View>
              <Text
                className={cn(vastuClasses.ayadiVerdict, v.ayadiCard.auspicious ? vastuClasses.ayadiGood : vastuClasses.ayadiBad)}
                style={nepaliTextStyle(13)}
              >
                {v.ayadiCard.verdict}
              </Text>
              {v.ayadiCard.suggestion && (
                <Text className={cn(vastuClasses.infoParagraphTight, "text-foreground")} style={nepaliTextStyle(13)}>
                  {v.ayadiCard.suggestion}
                </Text>
              )}
              <Text className={vastuClasses.infoDisclaimer} style={nepaliTextStyle(13)}>
                {v.ayadiCard.disclaimer}
              </Text>
            </View>

            <View className={vastuClasses.infoCard}>
              <Text className={vastuClasses.infoHeading} style={nepaliTextStyle(14)}>
                {v.entranceCard.heading}
              </Text>
              <Text className={cn(vastuClasses.infoParagraph, "text-foreground")} style={nepaliTextStyle(13)}>
                {v.entranceCard.note}
              </Text>
              <Text className={vastuClasses.infoDisclaimer} style={nepaliTextStyle(13)}>
                {v.entranceCard.disclaimer}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default PlotPlanner;
