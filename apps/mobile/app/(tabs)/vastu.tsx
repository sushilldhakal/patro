/**
 * वास्तु — the app's drawing of `useVastuPage` (@vedic-patro/features): the
 * 16-direction / 81-pada wheel with a live compass, the detail card for the
 * selected zone, the plot planner and the classical sources, as on the
 * website; the room and dosha reference sections stay at the bottom here.
 */

import { Pressable, View } from "react-native";
import { useVastuPage, type VastuChip, type VastuDetailRow, type VastuDirChip, type VastuPage } from "@vedic-patro/features/vastu";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PlotPlanner } from "@/components/vastu/PlotPlanner";
import { VastuPurushaWheel } from "@/components/vastu/VastuPurushaWheel";
import { useCompassHeading } from "@/lib/compass-heading";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { VASTU_INK, type VastuSelectionId } from "@vedic-patro/domain/vastu";
import { cn } from "@vedic-patro/design-tokens/cn";
import { spaceUnit } from "@vedic-patro/design-tokens";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

/** Page padding the wheel sits inside. */
const WHEEL_CHROME = 40;

function Chip({ chip }: { chip: VastuChip }) {
  const background = chip.tone === "tint" ? `${chip.color}33` : chip.color;
  const text = chip.tone === "sattva" ? VASTU_INK.text : chip.tone === "tamas" ? VASTU_INK.background : chip.color;
  return (
    <View className={vastuClasses.pill} style={{ backgroundColor: background }}>
      <Text className={vastuClasses.pillText} style={[nepaliTextStyle(12), { color: text }]}>
        {chip.label}
      </Text>
    </View>
  );
}

function PadaStatusMark({ status }: { status: "good" | "ok" | "bad" | "mixed" }) {
  if (status === "mixed") {
    return (
      <View className={vastuClasses.markStack}>
        <Text className={vastuClasses.markStackPlus}>+</Text>
        <Text className={vastuClasses.markStackMinus}>−</Text>
      </View>
    );
  }
  if (status === "good") return <Text className={vastuClasses.markPlus}>+</Text>;
  if (status === "bad") return <Text className={vastuClasses.markMinus}>−</Text>;
  return null;
}

function DetailValue({ row, onSelect }: { row: VastuDetailRow; onSelect: (id: VastuSelectionId) => void }) {
  if (row.kind === "text") {
    return (
      <Text className={row.danger ? vastuClasses.detailTextDanger : vastuClasses.detailText} style={nepaliTextStyle(13)}>
        {row.text}
      </Text>
    );
  }
  if (row.kind === "parent") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(row.id)}
        className={cn(vastuClasses.padaLink, "self-start")}
        style={{ borderColor: `${row.color}66` }}
      >
        <Text className={cn(vastuClasses.padaLinkText, vastuClasses.textIdle)} style={nepaliTextStyle(12)}>
          {row.text}
        </Text>
      </Pressable>
    );
  }
  return (
    <View className={vastuClasses.chipRow}>
      {row.padas.map((pada) => (
        <Pressable
          key={pada.id}
          accessibilityRole="button"
          accessibilityState={{ selected: pada.active }}
          onPress={() => onSelect(pada.id)}
          className={vastuClasses.padaLink}
          style={{ borderColor: pada.active ? pada.color : `${pada.color}66`, backgroundColor: pada.active ? `${pada.color}2e` : undefined }}
        >
          <Text className={cn(vastuClasses.padaLinkText, pada.active ? vastuClasses.textActive : vastuClasses.textIdle)} style={nepaliTextStyle(12)}>
            {pada.label}
          </Text>
          <PadaStatusMark status={pada.status} />
        </Pressable>
      ))}
    </View>
  );
}

function ZoneDetail({ page }: { page: VastuPage }) {
  const { zone } = page;
  return (
    <View className={vastuClasses.zoneCard} style={{ borderColor: `${zone.color}66` }}>
      <View className={vastuClasses.zoneHeader}>
        <Text className={vastuClasses.zoneTitle} style={nepaliTextStyle(20)}>
          {zone.title}
        </Text>
        {zone.chips.map((chip) => (
          <Chip key={chip.key} chip={chip} />
        ))}
      </View>
      {zone.importance ? (
        <Text className={vastuClasses.zoneImportance} style={nepaliTextStyle(13)}>
          {zone.importance}
        </Text>
      ) : null}
      <View className={vastuClasses.detailList}>
        {zone.rows.map((row) => (
          <View key={row.key} className={vastuClasses.detailRow}>
            <Text className={vastuClasses.detailLabel} style={nepaliTextStyle(13)}>
              {row.label}
            </Text>
            <View className={cn(vastuClasses.detailValue, "flex-1")}>
              <DetailValue row={row} onSelect={page.select} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DirChips({ chips, onSelect }: { chips: VastuDirChip[]; onSelect: (id: VastuSelectionId) => void }) {
  return (
    <View className={vastuClasses.chipRow}>
      {chips.map((dir) => (
        <Pressable
          key={dir.id}
          accessibilityRole="button"
          accessibilityLabel={dir.title}
          accessibilityState={{ selected: dir.active }}
          onPress={() => onSelect(dir.id)}
          className={vastuClasses.dirChip}
          style={{ borderColor: dir.active ? dir.color : `${dir.color}55`, backgroundColor: dir.active ? `${dir.color}2e` : undefined }}
        >
          <Text className={cn(vastuClasses.dirChipText, dir.active ? vastuClasses.textActive : vastuClasses.textIdle)} style={nepaliTextStyle(13)}>
            {dir.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionCard({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View className={cn(vastuClasses.section, "mb-4 overflow-hidden")}>
      <View className={vastuClasses.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.secondary} />
        <Text className={cn(vastuClasses.sectionHeading, "min-w-0 flex-1")} style={nepaliTextStyle(14)}>
          {title}
        </Text>
        {meta ? (
          <Text className={cn(vastuClasses.sectionHint, "shrink-0 text-foreground")} style={nepaliTextStyle(13)}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View className="gap-3 p-4">{children}</View>
    </View>
  );
}

export default function VastuScreen() {
  const colors = useThemeColors();
  const { width, isTablet } = useBreakpoint();
  const page = useVastuPage({ useCompass: useCompassHeading });
  const { copy, compass, dialog } = page;
  /* iPad: 10% under the full column width. */
  const wheelSize = Math.round(Math.max(280, width - WHEEL_CHROME) * (isTablet ? 0.9 : 1));

  return (
    <AppShell title={copy.title} showHeader={false}>
      <PatroPageHeader icon={<Ionicons name="compass-outline" size={28} color={colors.secondary} />} title={copy.title} subtitle={copy.subtitle} />

      <View className={cn(vastuClasses.section, "mb-4 overflow-hidden")}>
        <View className={vastuClasses.sectionHeader}>
          <Ionicons name="compass-outline" size={16} color={colors.secondary} />
          <Text className={vastuClasses.sectionHeading} style={nepaliTextStyle(14)}>
            {copy.planHeading}
          </Text>
          <Text className={cn(vastuClasses.sectionHint, "text-foreground")} style={nepaliTextStyle(13)}>
            {copy.planHint}
          </Text>
        </View>

        <View className={vastuClasses.planBody}>
          <Text className={cn(vastuClasses.planBlurb, "text-foreground")} style={nepaliTextStyle(13)}>
            {copy.wheelBlurb}
          </Text>

          <View className="gap-5">
            <View className="items-center">
              <VastuPurushaWheel size={wheelSize} selected={page.selected} onSelect={page.select} headingDeg={compass.heading} />
            </View>

            {compass.live ? (
              <View className={vastuClasses.compassBar}>
                <Ionicons name="compass-outline" size={16} color={colors.secondary} />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm text-foreground" style={nepaliTextStyle(13)}>
                    {compass.line}
                  </Text>
                  {compass.drifting ? (
                    <Text className={cn(vastuClasses.compassDrift, "text-sm")} style={nepaliTextStyle(13)}>
                      {copy.compassDrifting}
                    </Text>
                  ) : null}
                </View>
                <Button variant="outline" size="sm" label={copy.compassStop} onPress={compass.stop} />
              </View>
            ) : null}

            <ZoneDetail page={page} />
          </View>

          <DirChips chips={page.directions} onSelect={page.select} />
          <DirChips chips={page.directions16} onSelect={page.select} />
        </View>
      </View>

      <View className="mb-4">
        <PlotPlanner />
      </View>

      <View className={cn(vastuClasses.note, "mb-4")}>
        <Text className={vastuClasses.noteText} style={nepaliTextStyle(13)}>
          {copy.note}
        </Text>
      </View>

      <View className={cn(vastuClasses.sourcesCard, "mb-4")}>
        <Text className={vastuClasses.sourcesHeading} style={nepaliTextStyle(14)}>
          {copy.sourcesHeading}
        </Text>
        <Text className={vastuClasses.sourcesBlurb} style={nepaliTextStyle(13)}>
          {copy.sourcesBlurb}
        </Text>
        <View className={vastuClasses.sourcesList}>
          {page.sources.map((source) => (
            <View key={source.id} className={vastuClasses.sourceRow}>
              <Text className={vastuClasses.sourceIndex} style={nepaliTextStyle(13)}>
                {source.index}
              </Text>
              <View className={cn(vastuClasses.sourceBody, "flex-1")}>
                <Text className={vastuClasses.sourceCredit} style={nepaliTextStyle(13)}>
                  {source.credit}
                </Text>
                <Text className={vastuClasses.sourceLine} style={nepaliTextStyle(13)}>
                  {source.edition}
                </Text>
                <Text className={vastuClasses.sourceLine} style={nepaliTextStyle(13)}>
                  {source.used}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <SectionCard icon="home-outline" title={page.rooms.heading} meta={page.rooms.ideal}>
        <Text className="text-sm text-foreground" style={nepaliTextStyle(13)}>
          {page.rooms.blurb}
        </Text>
        {page.rooms.items.map((room) => (
          <View key={room.id} className={vastuClasses.roomCard} style={{ borderLeftWidth: 4, borderLeftColor: room.color }}>
            <View className="flex-row flex-wrap items-baseline gap-x-2">
              <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
                {room.name}
              </Text>
              <Text className="text-sm font-semibold" style={[nepaliTextStyle(13), { color: room.color }]}>
                {room.direction}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
              {room.note}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard icon="warning-outline" title={page.doshas.heading}>
        <Text className="text-sm text-foreground" style={nepaliTextStyle(13)}>
          {page.doshas.blurb}
        </Text>
        {page.doshas.items.map((dosha) => (
          <View key={dosha.id} className={vastuClasses.infoCard}>
            <View className="flex-row items-start gap-2">
              <Ionicons name="warning-outline" size={16} color={colors.danger} style={{ marginTop: spaceUnit * 0.75 }} />
              <Text className={cn(vastuClasses.sectionHeading, "min-w-0 flex-1")} style={nepaliTextStyle(14)}>
                {dosha.problem}
              </Text>
            </View>
            <View className="mt-2 flex-row items-start gap-2">
              <Ionicons name="build-outline" size={16} color={colors.secondary} style={{ marginTop: spaceUnit * 0.75 }} />
              <Text className="min-w-0 flex-1 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
                {dosha.remedy}
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <BottomSheetModal visible={dialog.open} onClose={() => dialog.setOpen(false)}>
        <View className="gap-3 p-4">
          <Text className="text-lg font-semibold tracking-tight text-foreground" style={nepaliTextStyle(18)}>
            {copy.dialogTitle}
          </Text>
          <Text className="text-sm text-foreground" style={nepaliTextStyle(13)}>
            {copy.dialogBody}
          </Text>
          {dialog.error ? (
            <Text className={vastuClasses.errorText} style={nepaliTextStyle(13)}>
              {dialog.error}
            </Text>
          ) : null}
          <View className="mt-1 flex-row justify-end gap-2">
            <Button variant="outline" label={copy.cancel} onPress={() => dialog.setOpen(false)} />
            <Button label={copy.done} onPress={dialog.confirm} />
          </View>
        </View>
      </BottomSheetModal>
    </AppShell>
  );
}
