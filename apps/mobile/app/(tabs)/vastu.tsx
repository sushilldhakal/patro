/**
 * वास्तु — the Vastu Purusha mandala, and a rough plan for a plot.
 *
 * Native counterpart of the web app's `src/pages/Vastu.tsx`, section for
 * section: the 16-direction / 81-pada wheel with a live compass, the detail
 * card for whatever zone is selected, the plot planner, and the classical
 * sources. Its wheel, ring and sketch are ports of the same components, and
 * every number they draw comes from the `@/lib/vastu` copy shared with web.
 *
 * The one deliberate addition over web: the older रुम and दोष reference
 * sections stay at the bottom of this page.
 */

import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PlotPlanner } from "@/components/vastu/PlotPlanner";
import { VastuPurushaWheel } from "@/components/vastu/VastuPurushaWheel";
import { useCompassHeading } from "@/lib/compass-heading";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import {
  VASTU_DIR16,
  VASTU_DIRECTIONS,
  VASTU_DOSHAS,
  VASTU_ELEMENT_COLOR,
  VASTU_GUNA_COLOR,
  VASTU_INK,
  VASTU_ROOMS,
  vastuDir16,
  vastuDir16AtBearing,
  vastuDir16ForPada,
  vastuDirection,
  vastuPada,
  vastuSelection,
  type VastuGunaId,
  type VastuPadaId,
  type VastuSelectionId,
} from "@vedic-patro/domain/vastu";
import { cn } from "@/lib/utils";

/** How long to wait for a first heading before calling the compass unusable. */
const COMPASS_TIMEOUT_MS = 4000;
/** Page padding the wheel sits inside. */
const WHEEL_CHROME = 40;

function Chip({
  color,
  label,
  tone = "tint",
}: {
  color: string;
  label: string;
  tone?: "tint" | "sattva" | "tamas";
}) {
  const background = tone === "tint" ? `${color}33` : color;
  const text = tone === "sattva" ? VASTU_INK.text : tone === "tamas" ? VASTU_INK.background : color;
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: background }}>
      <Text className="text-caption font-semibold" style={[nepaliTextStyle(12), { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

function gunaTone(guna: VastuGunaId): "sattva" | "tamas" | "tint" {
  if (guna === "sattva") return "sattva";
  if (guna === "tamas") return "tamas";
  return "tint";
}

function PadaStatusMark({ status }: { status: "good" | "ok" | "bad" | "mixed" }) {
  if (status === "mixed") {
    return (
      <View className="ml-1 items-center">
        <Text className="text-caption font-extrabold" style={{ color: "#2f6b3c" }}>
          +
        </Text>
        <Text className="text-caption font-extrabold" style={{ color: "#8f2f28" }}>
          −
        </Text>
      </View>
    );
  }
  if (status === "good") {
    return (
      <Text className="ml-1 font-extrabold" style={{ color: "#2f6b3c" }}>
        +
      </Text>
    );
  }
  if (status === "bad") {
    return (
      <Text className="ml-1 font-extrabold" style={{ color: "#8f2f28" }}>
        −
      </Text>
    );
  }
  return null;
}

function PadaLinks({
  ids,
  selected,
  onSelect,
}: {
  ids: readonly VastuPadaId[];
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
}) {
  const { t } = useLocale();
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {ids.map((id) => {
        const pada = vastuPada(id);
        const active = selected === id;
        const color = VASTU_ELEMENT_COLOR[pada.element];
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(id)}
            className="flex-row items-center rounded-md border px-2 py-0.5"
            style={{
              borderColor: active ? color : `${color}66`,
              backgroundColor: active ? `${color}2e` : undefined,
            }}
          >
            <Text
              className={cn(
                "text-caption font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              style={nepaliTextStyle(12)}
            >
              {pada.code} · {t(`vastu.pada.${id}.name`)}
            </Text>
            <PadaStatusMark status={pada.status} />
          </Pressable>
        );
      })}
    </View>
  );
}

const VASTU_SOURCE_IDS = ["mayamata", "manasara", "vishvakarma", "samarangana", "aparajita"] as const;

function VastuSources() {
  const { t, digits } = useLocale();
  return (
    <View className="rounded-xl border border-border bg-muted/40 p-3.5">
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {t("vastu.sources.heading")}
      </Text>
      <Text className="text-body mt-1.5 text-muted-foreground" style={nepaliTextStyle(13)}>
        {t("vastu.sources.blurb")}
      </Text>
      <View className="mt-4 gap-4">
        {VASTU_SOURCE_IDS.map((id, i) => (
          <View key={id} className="flex-row gap-3">
            <Text
              className="text-body w-5 shrink-0 font-semibold text-muted-foreground"
              style={nepaliTextStyle(13)}
            >
              {digits(i + 1)}.
            </Text>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(13)}>
                {t(`vastu.sources.${id}.credit`)}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(`vastu.sources.${id}.edition`)}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(`vastu.sources.${id}.used`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** One `label / value` line in the zone detail card. */
function DetailRow({
  label,
  children,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <Text
        className="text-body w-[96px] shrink-0 font-semibold text-muted-foreground"
        style={nepaliTextStyle(13)}
      >
        {label}
      </Text>
      <View className="min-w-0 flex-1">
        {typeof children === "string" ? (
          <Text
            className={cn("text-body", danger ? "text-danger" : "text-foreground")}
            style={nepaliTextStyle(13)}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function ZoneDetail({
  id,
  onSelect,
}: {
  id: VastuSelectionId;
  onSelect: (next: VastuSelectionId) => void;
}) {
  const { t } = useLocale();
  const zone = vastuSelection(id);
  const color = VASTU_ELEMENT_COLOR[zone.element];
  const gunaColor = VASTU_GUNA_COLOR[zone.guna];
  const parent16 = zone.kind === "pada" ? vastuDir16(vastuDir16ForPada(id as VastuPadaId)) : null;

  return (
    <View className="rounded-2xl border bg-card p-4" style={{ borderColor: `${color}66` }}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(20)}>
          {t(`${zone.copyPrefix}.name`)}
        </Text>
        <Chip color={VASTU_INK.line} label={t(`vastu.labels.kind.${zone.kind}`)} />
        {zone.padaCode ? <Chip color={color} label={zone.padaCode} /> : null}
        {zone.attrKey ? <Chip color={color} label={t(zone.attrKey)} /> : null}
        <Chip color={color} label={t(`vastu.element.${zone.element}`)} />
        <Chip
          color={gunaColor}
          label={t(`vastu.wheel.organ.${zone.guna}`)}
          tone={gunaTone(zone.guna)}
        />
        {zone.status === "mixed" ? (
          <>
            <Chip color="#2f6b3c" label={t("vastu.wheel.status.good")} />
            <Chip color="#8f2f28" label={t("vastu.wheel.status.bad")} />
          </>
        ) : zone.status ? (
          <Chip
            color={zone.status === "good" ? "#2f6b3c" : "#8f2f28"}
            label={t(`vastu.wheel.status.${zone.status}`)}
          />
        ) : null}
      </View>

      {zone.kind !== "dir16" && zone.kind !== "pada" ? (
        <Text className="text-body mt-3 text-foreground" style={nepaliTextStyle(13)}>
          {t(`${zone.copyPrefix}.importance`)}
        </Text>
      ) : null}

      <View className="mt-4 gap-3">
        {zone.kind === "dir16" ? (
          <>
            <DetailRow label={t("vastu.labels.quality")}>{t(`${zone.copyPrefix}.quality`)}</DetailRow>
            <DetailRow label={t("vastu.labels.element")}>{t(`vastu.element.${zone.element}`)}</DetailRow>
            <DetailRow label={t("vastu.labels.guna")}>{t(`vastu.wheel.organ.${zone.guna}`)}</DetailRow>
            <DetailRow label={t("vastu.labels.description")}>
              {t(`${zone.copyPrefix}.importance`)}
            </DetailRow>
          </>
        ) : null}
        {zone.kind === "pada" ? (
          <>
            <DetailRow label={t("vastu.labels.deity")}>{t(`${zone.copyPrefix}.deity`)}</DetailRow>
            <DetailRow label={t("vastu.labels.element")}>{t(`vastu.element.${zone.element}`)}</DetailRow>
            <DetailRow label={t("vastu.labels.guna")}>{t(`vastu.wheel.organ.${zone.guna}`)}</DetailRow>
          </>
        ) : null}
        {zone.kind !== "pada" && zone.kind !== "inner4" ? (
          <DetailRow label={t("vastu.labels.deity")}>{t(`${zone.copyPrefix}.deity`)}</DetailRow>
        ) : null}
        {zone.innerDeity ? (
          <DetailRow label={t("vastu.labels.inner_deity")}>
            {t(`vastu.pada.${zone.innerDeity}.name`)}
          </DetailRow>
        ) : null}
        {zone.padas && zone.padas.length > 0 ? (
          <DetailRow label={t("vastu.labels.pada")}>
            <PadaLinks ids={zone.padas} selected={id} onSelect={onSelect} />
          </DetailRow>
        ) : null}
        {parent16 ? (
          <DetailRow label={t("vastu.labels.kind.dir16")}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(parent16.id)}
              className="self-start rounded-md border px-2 py-0.5"
              style={{ borderColor: `${VASTU_ELEMENT_COLOR[parent16.element]}66` }}
            >
              <Text
                className="text-caption font-semibold text-muted-foreground"
                style={nepaliTextStyle(12)}
              >
                {parent16.abbr} · {t(parent16.attrKey)}
              </Text>
            </Pressable>
          </DetailRow>
        ) : null}
        <DetailRow label={t("vastu.labels.best")}>{t(`${zone.copyPrefix}.best`)}</DetailRow>
        <DetailRow label={t("vastu.labels.avoid")} danger>
          {t(`${zone.copyPrefix}.avoid`)}
        </DetailRow>
      </View>
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
    <View className="mb-4 overflow-hidden rounded-2xl border border-border">
      <View className="flex-row items-center gap-1.5 border-b border-border px-4 py-3">
        <Ionicons name={icon} size={16} color={colors.secondary} />
        <Text
          className="text-body min-w-0 flex-1 font-semibold text-foreground"
          style={nepaliTextStyle(14)}
        >
          {title}
        </Text>
        {meta ? (
          <Text className="text-body shrink-0 text-muted-foreground" style={nepaliTextStyle(13)}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View className="gap-3 p-4">{children}</View>
    </View>
  );
}

export default function VastuScreen() {
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const { width, isTablet } = useBreakpoint();
  const [selected, setSelected] = useState<VastuSelectionId>("northeast");
  const [alignOpen, setAlignOpen] = useState(false);
  const [compassLive, setCompassLive] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const compass = useCompassHeading(compassLive);

  // A compass that never produces a heading (no magnetometer, permission
  // revoked out from under us) would otherwise leave the wheel silently
  // un-rotated with no way back to the dialog.
  useEffect(() => {
    if (!compassLive || compass.heading != null) return;
    const id = setTimeout(() => {
      setCompassLive(false);
      setAlignOpen(true);
      setCompassError(t("vastu.compass.unavailable"));
    }, COMPASS_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [compassLive, compass.heading, t]);

  const facing = compass.heading != null ? vastuDir16(vastuDir16AtBearing(compass.heading)) : null;
  /* iPad: 10% under the full column width. */
  const wheelSize = Math.round(Math.max(280, width - WHEEL_CHROME) * (isTablet ? 0.9 : 1));

  function onSelect(id: VastuSelectionId) {
    setSelected(id);
    if (id === "center" && !compassLive) {
      setCompassError(null);
      setAlignOpen(true);
    }
  }

  async function onAlignDone() {
    setCompassError(null);
    const ok = await compass.requestPermission();
    if (!ok) {
      setCompassError(t("vastu.compass.denied"));
      return;
    }
    setCompassLive(true);
    setAlignOpen(false);
  }

  return (
    <AppShell title={t("vastu.title")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="compass-outline" size={28} color={colors.secondary} />}
        title={t("vastu.title")}
        subtitle={t("vastu.subtitle")}
      />

      <View className="mb-4 overflow-hidden rounded-2xl border border-border">
        <View className="flex-row flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          <Ionicons name="compass-outline" size={16} color={colors.secondary} />
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
            {t("vastu.plan.heading")}
          </Text>
          <Text className="text-body ml-auto text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.plan.hint")}
          </Text>
        </View>

        <View className="gap-4 p-3">
          <Text className="text-body text-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.wheel.blurb")}
          </Text>

          <View className="gap-5">
            <View className="items-center">
              <VastuPurushaWheel
                size={wheelSize}
                selected={selected}
                onSelect={onSelect}
                headingDeg={compassLive ? compass.heading : null}
              />
            </View>

            {compassLive ? (
              <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <Ionicons name="compass-outline" size={16} color={colors.secondary} />
                <View className="min-w-0 flex-1">
                  <Text className="text-body text-foreground" style={nepaliTextStyle(13)}>
                    {t("vastu.compass.live")}
                    {facing
                      ? ` ${t("vastu.compass.facing", {
                          name: t(`vastu.dir16.${facing.id}.name`),
                          abbr: facing.abbr,
                        })}`
                      : ""}
                    {facing && compass.heading != null
                      ? ` · ${digits(Math.round(compass.heading))}°`
                      : ""}
                  </Text>
                  {compass.drifting ? (
                    <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
                      {t("vastu.compass.drifting")}
                    </Text>
                  ) : null}
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  label={t("vastu.compass.stop")}
                  onPress={() => setCompassLive(false)}
                />
              </View>
            ) : null}

            <ZoneDetail id={selected} onSelect={onSelect} />
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {VASTU_DIRECTIONS.map((dir) => {
              const active = dir.id === selected;
              const color = VASTU_ELEMENT_COLOR[dir.element];
              return (
                <Pressable
                  key={dir.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(dir.id)}
                  className="rounded-lg border px-2.5 py-1.5"
                  style={{
                    borderColor: active ? color : `${color}55`,
                    backgroundColor: active ? `${color}2e` : undefined,
                  }}
                >
                  <Text
                    className={cn(
                      "text-body font-semibold",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                    style={nepaliTextStyle(13)}
                  >
                    {t(`vastu.dir.${dir.id}.name`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {VASTU_DIR16.map((dir) => {
              const active = dir.id === selected;
              const color = VASTU_ELEMENT_COLOR[dir.element];
              return (
                <Pressable
                  key={dir.id}
                  accessibilityRole="button"
                  accessibilityLabel={t(`vastu.dir16.${dir.id}.name`)}
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(dir.id)}
                  className="rounded-lg border px-2.5 py-1.5"
                  style={{
                    borderColor: active ? color : `${color}55`,
                    backgroundColor: active ? `${color}2e` : undefined,
                  }}
                >
                  <Text
                    className={cn(
                      "text-body font-semibold",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                    style={nepaliTextStyle(13)}
                  >
                    {dir.abbr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mb-4">
        <PlotPlanner />
      </View>

      <View className="mb-4 rounded-xl border border-border bg-muted/40 p-3.5">
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
          {t("vastu.note")}
        </Text>
      </View>

      <View className="mb-4">
        <VastuSources />
      </View>

      <SectionCard icon="home-outline" title={t("vastu.rooms.heading")} meta={t("vastu.rooms.ideal")}>
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
          {t("vastu.rooms.blurb")}
        </Text>
        {VASTU_ROOMS.map((room) => {
          const dir = vastuDirection(room.direction);
          const color = VASTU_ELEMENT_COLOR[dir.element];
          return (
            <View
              key={room.id}
              className="rounded-xl border border-border bg-card p-3"
              style={{ borderLeftWidth: 4, borderLeftColor: color }}
            >
              <View className="flex-row flex-wrap items-baseline gap-x-2">
                <Text className="font-semibold text-foreground" style={nepaliTextStyle(15)}>
                  {t(`vastu.room.${room.id}.name`)}
                </Text>
                <Text className="text-body font-semibold" style={[nepaliTextStyle(13), { color }]}>
                  {t(`vastu.dir.${room.direction}.name`)}
                </Text>
              </View>
              <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(`vastu.room.${room.id}.note`)}
              </Text>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard icon="warning-outline" title={t("vastu.dosha.heading")}>
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
          {t("vastu.dosha.blurb")}
        </Text>
        {VASTU_DOSHAS.map((id) => (
          <View key={id} className="rounded-xl border border-border bg-card p-3.5">
            <View className="flex-row items-start gap-2">
              <Ionicons name="warning-outline" size={16} color={colors.danger} style={{ marginTop: 3 }} />
              <Text className="min-w-0 flex-1 font-semibold text-foreground" style={nepaliTextStyle(14)}>
                {t(`vastu.dosha.${id}.problem`)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-start gap-2">
              <Ionicons name="build-outline" size={16} color={colors.secondary} style={{ marginTop: 3 }} />
              <Text className="text-body min-w-0 flex-1 text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(`vastu.dosha.${id}.remedy`)}
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <BottomSheetModal visible={alignOpen} onClose={() => setAlignOpen(false)}>
        <View className="gap-3 p-4">
          <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
            {t("vastu.compass.dialog_title")}
          </Text>
          <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.compass.dialog_body")}
          </Text>
          {compassError ? (
            <Text className="text-body text-danger" style={nepaliTextStyle(13)}>
              {compassError}
            </Text>
          ) : null}
          <View className="mt-1 flex-row justify-end gap-2">
            <Button
              variant="outline"
              label={t("vastu.compass.cancel")}
              onPress={() => setAlignOpen(false)}
            />
            <Button label={t("vastu.compass.done")} onPress={() => void onAlignDone()} />
          </View>
        </View>
      </BottomSheetModal>
    </AppShell>
  );
}
