import { useWindowDimensions } from "react-native";
import { Box, Input, Text } from "@vedic-patro/ui";
import type { CardinalWall } from "@vedic-patro/domain/vastu";
import { VASTU_INK } from "@vedic-patro/domain/vastu";
import { CX, CY } from "@vedic-patro/domain/vastu-purusha-wheel";
import { VASTU_STATUS_MARK, usePlotPlanner } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import type { PlotPlannerProps } from "../contract";
import { HouseSketch } from "./HouseSketch";

const center = { cx: CX, cy: CY };
const marks = { good: VASTU_STATUS_MARK.good, bad: VASTU_STATUS_MARK.bad };

export function PlotPlanner({ storage, offline, renderSelect, renderOwner, renderRequirements, sketchSize }: PlotPlannerProps) {
  const { width } = useWindowDimensions();
  const edge = sketchSize ?? Math.round(Math.min(900, Math.max(240, width - 56)));
  const v = usePlotPlanner({ storage, offline });
  const { copy, plot, errors } = v;
  return (
    <Box className={cn(vastuClasses.section, "overflow-hidden")}>
      <Box className={vastuClasses.sectionHeader}>
        <Text className={vastuClasses.sectionHeading}>{copy.heading}</Text>
      </Box>
      <Box className={vastuClasses.plotBody}>
        <Text className={cn(vastuClasses.planBlurb, "text-foreground")}>{copy.blurb}</Text>
        {renderOwner()}
        <Box nativeClassName="flex-row" className="gap-3">
          <Box className="min-w-0 flex-1">
            <Text className={vastuClasses.fieldLabel}>{copy.lengthLabel}</Text>
            <Input label={copy.lengthLabel} type="number" value={plot.length} onChange={(value) => v.update({ length: value })} className={errors.length ? "border-destructive" : undefined} />
          </Box>
          <Box className="min-w-0 flex-1">
            <Text className={vastuClasses.fieldLabel}>{copy.breadthLabel}</Text>
            <Input label={copy.breadthLabel} type="number" value={plot.breadth} onChange={(value) => v.update({ breadth: value })} className={errors.breadth ? "border-destructive" : undefined} />
          </Box>
        </Box>
        <Box>
          <Text className={vastuClasses.fieldLabel}>{copy.facingLabel}</Text>
          {renderSelect ? renderSelect({ value: plot.facing, label: copy.facingLabel, options: v.facingOptions, onChange: (value) => v.update({ facing: value as CardinalWall }) }) : null}
        </Box>
        {copy.rangeError ? <Text className={vastuClasses.destructiveText}>{copy.rangeError}</Text> : null}
        {renderRequirements({ plan: v.house, onChange: v.updateHouse })}
        <Box className={vastuClasses.layoutCard}>
          <Text className={vastuClasses.layoutHeading}>{copy.layoutHeading}</Text>
          <Text className={vastuClasses.layoutBlurb}>{copy.layoutBlurb}</Text>
          {copy.sketchStatus ? <Text className={vastuClasses.layoutStatus}>{copy.sketchStatus}</Text> : null}
          {v.cannotFit ? (
            <Box className={vastuClasses.cannotFit}>
              <Text className={vastuClasses.cannotFitHeading}>{v.cannotFit.heading}</Text>
              <Text className={vastuClasses.cannotFitBlurb}>{v.cannotFit.blurb}</Text>
              <Box className={vastuClasses.cannotFitList}>
                {v.cannotFit.items.map((item) => (
                  <Box key={item.id} className={vastuClasses.cannotFitItem}>
                    <Text className={vastuClasses.cannotFitItemText}>{item.name}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box className={vastuClasses.storeyList}>
            {v.storeys.map((s) => (
              <Box key={s.storey} className="min-w-0">
                {s.title ? <Text className={vastuClasses.storeyTitle}>{s.title}</Text> : null}
                <HouseSketch size={edge} plot={v.footprint} facing={plot.facing} assignments={s.assignments} ink={VASTU_INK} center={center} marks={marks} />
              </Box>
            ))}
          </Box>
          <Text className={vastuClasses.mutedNoteTop}>{copy.disclaimer}</Text>
          <Text className={vastuClasses.mutedNoteTop}>{copy.bufferNote}</Text>
          <Text className={vastuClasses.mutedNote}>{copy.marmaNote}</Text>
        </Box>
        {v.ayadiCard && v.entranceCard ? (
          <Box className="gap-3">
            <Box className={vastuClasses.infoCard}>
              <Text className={vastuClasses.infoHeading}>{v.ayadiCard.heading}</Text>
              <Box className={vastuClasses.infoRows}>
                {v.ayadiCard.rows.map((row) => (
                  <Box key={row.key} className={vastuClasses.infoRow}>
                    <Text className={vastuClasses.infoLabel}>{row.label}</Text>
                    <Text className={cn("text-right text-foreground", row.strong && "font-semibold")}>{row.value}</Text>
                  </Box>
                ))}
              </Box>
              <Text className={cn(vastuClasses.ayadiVerdict, v.ayadiCard.auspicious ? vastuClasses.ayadiGood : vastuClasses.ayadiBad)}>{v.ayadiCard.verdict}</Text>
              {v.ayadiCard.suggestion ? <Text className={cn(vastuClasses.infoParagraphTight, "text-foreground")}>{v.ayadiCard.suggestion}</Text> : null}
              <Text className={vastuClasses.infoDisclaimer}>{v.ayadiCard.disclaimer}</Text>
            </Box>
            <Box className={vastuClasses.infoCard}>
              <Text className={vastuClasses.infoHeading}>{v.entranceCard.heading}</Text>
              <Text className={cn(vastuClasses.infoParagraph, "text-foreground")}>{v.entranceCard.note}</Text>
              <Text className={vastuClasses.infoDisclaimer}>{v.entranceCard.disclaimer}</Text>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
