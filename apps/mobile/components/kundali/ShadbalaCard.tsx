import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { ShadbalaChart } from "@/components/kundali/ShadbalaChart";
import {
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
  tableColumnLayout,
} from "@/components/ui/DataTable";
import type {
  BhavaBalaData,
  ShadbalaPlanet,
  ShadbalaResponse,
  ShadbalaStatus,
  YuddhaData,
} from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { KALA_SUBS, STHANA_SUBS, orderShadbalaPlanets, yuddhaVirupasForPlanet } from "@vedic-patro/domain/kundali/shadbala-display";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { fmt } from "@vedic-patro/domain/kundali/shadbala-chart";

import { illustration } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";
const STATUS_ORDER: ShadbalaStatus[] = [
  "Exceptional",
  "Strong",
  "Adequate",
  "Borderline",
  "Weak",
];

const STATUS_LABEL: Record<ShadbalaStatus, { ne: string; en: string }> = {
  Exceptional: { get ne() { return tFor("ne", "kundali.x.status_exceptional"); }, get en() { return tFor("en", "kundali.x.status_exceptional"); } },
  Strong: { get ne() { return tFor("ne", "kundali.report.confidence_strong"); }, get en() { return tFor("en", "kundali.report.confidence_strong"); } },
  Adequate: { get ne() { return tFor("ne", "kundali.x.status_adequate"); }, get en() { return tFor("en", "kundali.x.status_adequate"); } },
  Borderline: { get ne() { return tFor("ne", "kundali.x.status_borderline"); }, get en() { return tFor("en", "kundali.x.status_borderline"); } },
  Weak: { get ne() { return tFor("ne", "kundali.x.status_weak"); }, get en() { return tFor("en", "kundali.x.status_weak"); } },
};

const STATUS_COLORS: Record<ShadbalaStatus, string> = {
  Exceptional: illustration.teal39,
  Strong: illustration.teal48,
  Adequate: illustration.orange50,
  Borderline: illustration.orange53c,
  Weak: illustration.red51,
};

const LABEL_COL = 132;
const PLANET_COL = 88;
const TABLE_STRETCH = true;
const GLANCE_GAP = 8;

/** Glance summary tiles: 4-across → 2 → 1 by available content width. */
function glanceColumnCount(contentWidth: number): 1 | 2 | 4 {
  if (contentWidth >= 840) return 4;
  if (contentWidth >= 420) return 2;
  return 1;
}

function glanceTileLayout(contentWidth: number, cols: 1 | 2 | 4): ViewStyle {
  if (cols === 1) return { width: "100%" };
  if (contentWidth <= 0) {
    return cols === 4
      ? { flexBasis: "23%", flexGrow: 1, minWidth: 150 }
      : { flexBasis: "48%", flexGrow: 1, minWidth: 160 };
  }
  const w = Math.floor((contentWidth - GLANCE_GAP * (cols - 1)) / cols);
  return { width: w };
}

function StatusBadge({ status }: { status: ShadbalaStatus }) {
  const { pick } = useLocale();
  const color = STATUS_COLORS[status];
  return (
    <View
      style={{
        backgroundColor: colorWithAlpha(color, 0.15),
        borderColor: colorWithAlpha(color, 0.35),
      }}
      className={cn(kundaliDetailClasses.parts.pill, "self-end")}
    >
      <Text style={{ color, ...nepaliTextStyle(11) }} className="text-caption font-semibold">
        {pick(STATUS_LABEL[status].ne, STATUS_LABEL[status].en)}
      </Text>
    </View>
  );
}

function GlanceTile({
  label,
  children,
  layout,
}: {
  label: string;
  children: ReactNode;
  layout: ViewStyle;
}) {
  return (
    <View style={layout} className={kundaliDetailClasses.glance.card}>
      <Text className={kundaliDetailClasses.glance.label} style={nepaliTextStyle(11)}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function MatrixRow({
  label,
  planets,
  value,
  bold,
  expandable,
  open,
  onToggle,
  sub,
  rowIndex,
  selectedKey,
}: {
  label: string;
  planets: ShadbalaPlanet[];
  value: (p: ShadbalaPlanet) => string | ReactNode;
  bold?: boolean;
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
  sub?: boolean;
  rowIndex: number;
  selectedKey?: string;
}) {
  const colors = useThemeColors();

  const labelCell = (
    <View
      style={{
        ...tableColumnLayout(TABLE_STRETCH, LABEL_COL),
        backgroundColor: sub ? colorWithAlpha(colors.muted, 0.35) : undefined,
      }}
      className={sub ? "justify-center px-5 py-1.5" : "justify-center px-2.5 py-1.5"}
    >
      {expandable ? (
        <Pressable onPress={onToggle} className="flex-row items-center gap-1 active:opacity-70">
          <Ionicons
            name={open ? "chevron-down" : "chevron-forward"}
            size={14}
            color={colors.foreground}
          />
          <Text
            className={cn("text-sm text-foreground", bold || expandable ? "font-semibold" : "")}
            style={nepaliTextStyle(11)}
            numberOfLines={2}
          >
            {label}
          </Text>
        </Pressable>
      ) : (
        <Text
          className={cn("text-sm text-foreground", sub ? "" : "font-semibold")}
          style={nepaliTextStyle(11)}
          numberOfLines={2}
        >
          {label}
        </Text>
      )}
    </View>
  );

  return (
    <TableRow rowIndex={rowIndex} borderTop>
      {labelCell}
      {planets.map((p) => (
        <View
          key={p.key}
          style={{
            ...tableColumnLayout(TABLE_STRETCH, PLANET_COL),
            backgroundColor: selectedKey === p.key ? colorWithAlpha(colors.primary, 0.1) : undefined,
          }}
          className="items-end justify-center px-1.5 py-1.5"
        >
          {typeof value(p) === "string" || typeof value(p) === "number" ? (
            <Text
              className={cn("font-mono text-sm text-foreground", bold ? "font-semibold" : "text-foreground/90")}
              style={nepaliTextStyle(11)}
              numberOfLines={1}
            >
              {value(p)}
            </Text>
          ) : (
            value(p)
          )}
        </View>
      ))}
    </TableRow>
  );
}

export function ShadbalaCard({
  data,
  yuddha,
  bhavaBala,
  compactHeader = false,
}: {
  data: ShadbalaResponse;
  yuddha?: YuddhaData;
  bhavaBala?: BhavaBalaData | null;
  /** When true, omit in-card title (parent KundaliSection already shows षड्बल). */
  compactHeader?: boolean;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width: windowWidth } = useBreakpoint();
  const [contentWidth, setContentWidth] = useState(0);
  const [openSthana, setOpenSthana] = useState(false);
  const [openKala, setOpenKala] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("sun");

  const effectiveWidth = contentWidth || windowWidth;
  const glanceCols = useMemo(() => glanceColumnCount(effectiveWidth), [effectiveWidth]);
  const tileLayout = useMemo(
    () => glanceTileLayout(contentWidth || effectiveWidth, glanceCols),
    [contentWidth, effectiveWidth, glanceCols],
  );

  const { planets, summary } = data;

  const ordered = useMemo(() => orderShadbalaPlanets(planets), [planets]);

  const rankByKey = useMemo(
    () =>
      new Map(
        [...planets]
          .sort((a, b) => b.ratio - a.ratio)
          .map((p, i) => [p.key, i + 1]),
      ),
    [planets],
  );

  const hasSubs = ordered.some((p) => p.sub_balas != null);
  const hasPhala = ordered.some((p) => p.ishta_phala != null);
  const hasYuddhaActivity = (yuddha?.wars.length ?? 0) > 0;

  const rowLabel = (ne: string, en: string) => pick(ne, en);
  const planetName = (p: ShadbalaPlanet) => (lang === "en" ? p.name : p.name_ne);
  const grahaName = (key: string) => {
    const g = GRAHA_NAME[key as GrahaKey];
    return g ? (lang === "en" ? g.en : g.ne) : key;
  };

  let matrixRowIndex = 0;

  return (
    <View
      className="gap-5"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - contentWidth) > 1) setContentWidth(w);
      }}
    >
      <View>
        {!compactHeader ? (
          <Text className={kundaliDetailClasses.glance.heading} style={nepaliTextStyle(13)}>
            {kundaliLabel("shadbala_planetary_strength_virupas", lang)}
          </Text>
        ) : null}
        <Text className={kundaliDetailClasses.glance.introSpaced} style={nepaliTextStyle(12)}>
          {pick(tFor(undefined, "ui.kundali.x_4836cfed"), data.method)}
        </Text>

        <View className="flex-row flex-wrap" style={{ gap: GLANCE_GAP }}>
          <GlanceTile layout={tileLayout} label={kundaliLabel("strongest_planet", lang)}>
            <View className={cn(kundaliDetailClasses.glance.nameRow, "flex-wrap")}>
              <GrahaPlanetIcon graha={summary.strongest.key as GrahaKey} size={28} />
              <Text className={kundaliDetailClasses.glance.name} style={nepaliTextStyle(17)}>
                {lang === "en" ? summary.strongest.name : summary.strongest.name_ne}
              </Text>
            </View>
            <View className={cn(kundaliDetailClasses.glance.badgeRow, "flex-wrap")}>
              <StatusBadge status={summary.strongest.status} />
              <Text className={kundaliDetailClasses.glance.sub} style={nepaliTextStyle(11)}>
                {pick(
                  tFor(undefined, "ui.kundali.x_bab6a0ed", { v0: digits(summary.strongest.ratio.toFixed(2)) }),
                  `${summary.strongest.ratio.toFixed(2)}x required`,
                )}
              </Text>
            </View>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("weakest_planet", lang)}>
            <View className={cn(kundaliDetailClasses.glance.nameRow, "flex-wrap")}>
              <GrahaPlanetIcon graha={summary.weakest.key as GrahaKey} size={28} />
              <Text className={kundaliDetailClasses.glance.name} style={nepaliTextStyle(17)}>
                {lang === "en" ? summary.weakest.name : summary.weakest.name_ne}
              </Text>
            </View>
            <View className={cn(kundaliDetailClasses.glance.badgeRow, "flex-wrap")}>
              <StatusBadge status={summary.weakest.status} />
              <Text className={kundaliDetailClasses.glance.sub} style={nepaliTextStyle(11)}>
                {pick(
                  tFor(undefined, "ui.kundali.x_bab6a0ed", { v0: digits(summary.weakest.ratio.toFixed(2)) }),
                  `${summary.weakest.ratio.toFixed(2)}x required`,
                )}
              </Text>
            </View>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("average_rupas", lang)}>
            <Text className={cn(kundaliDetailClasses.glance.big, "font-num")} style={nepaliTextStyle(22)}>
              {digits(summary.average_rupas.toFixed(2))}
            </Text>
            <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
              {digits(summary.average_virupas.toFixed(2))} {kundaliLabel("virupas", lang)}
            </Text>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("planets_meeting_threshold", lang)}>
            <Text className={cn(kundaliDetailClasses.glance.big, "font-num")} style={nepaliTextStyle(22)}>
              {digits(summary.meeting_threshold)}
              <Text className={kundaliDetailClasses.glance.bigOf}> / {digits(summary.total_planets)}</Text>
            </Text>
            <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
              {kundaliLabel("adequate_or_stronger", lang)}
            </Text>
            <View className={kundaliDetailClasses.glance.chips}>
              {STATUS_ORDER.map((s) => {
                const color = STATUS_COLORS[s];
                const active = summary.counts[s] > 0;
                return (
                  <View
                    key={s}
                    style={{
                      backgroundColor: active ? colorWithAlpha(color, 0.12) : colors.card,
                      borderColor: active ? colorWithAlpha(color, 0.35) : colors.border,
                    }}
                    className={kundaliDetailClasses.glance.chip}
                  >
                    <Text
                      style={{ color: active ? color : colors.mutedForeground, ...nepaliTextStyle(10) }}
                      className="text-caption"
                    >
                      {pick(STATUS_LABEL[s].ne, STATUS_LABEL[s].en)} {digits(summary.counts[s])}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlanceTile>
        </View>
      </View>

      <ShadbalaChart planets={ordered} selectedKey={selectedKey} onSelect={setSelectedKey} yuddha={yuddha} />

      <View>
        <Text className={kundaliDetailClasses.glance.tableTitle} style={nepaliTextStyle(13)}>
          {kundaliLabel("shadbala_table", lang)}
        </Text>

        <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
          <View className="w-full">
            <TableHeader>
              <TableHeaderCell
                flex={LABEL_COL}
                minWidth={Math.round(LABEL_COL * 0.72)}
                compact
              >
                <TableHeaderLabel compact uppercase={false}>
                  {kundaliLabel("bala", lang)}
                </TableHeaderLabel>
              </TableHeaderCell>
              {ordered.map((p) => (
                <TableHeaderCell
                  key={p.key}
                  flex={PLANET_COL}
                  minWidth={Math.round(PLANET_COL * 0.72)}
                  compact
                  onPress={() => setSelectedKey(p.key)}
                  className={p.key === selectedKey ? "bg-primary/10" : undefined}
                >
                  <View className="w-full flex-row items-center justify-end gap-1">
                    <GrahaPlanetIcon graha={p.key as GrahaKey} size={18} />
                    <TableHeaderLabel compact uppercase={false} numberOfLines={1}>
                      {planetName(p)}
                    </TableHeaderLabel>
                  </View>
                </TableHeaderCell>
              ))}
            </TableHeader>

            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.relative_rank"), tFor("en", "kundali.x.relative_rank"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => digits(String(rankByKey.get(p.key) ?? "—"))}
              bold
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.bala_sthana"), tFor("en", "kundali.x.bala_sthana"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.sthana, digits)}
              expandable={hasSubs}
              open={openSthana}
              onToggle={() => setOpenSthana((v) => !v)}
            />
            {openSthana
              ? STHANA_SUBS.map((row) => (
                  <MatrixRow
                    key={row.key}
                    rowIndex={matrixRowIndex++}
                    label={t(row.label)}
                    planets={ordered}
                    selectedKey={selectedKey}
                    value={(p) => fmt(p.sub_balas?.sthana?.[row.key], digits)}
                    sub
                  />
                ))
              : null}
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.disha"), tFor("en", "kundali.disha"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.dig, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.bala_kala"), tFor("en", "kundali.x.bala_kala"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.kala, digits)}
              expandable={hasSubs}
              open={openKala}
              onToggle={() => setOpenKala((v) => !v)}
            />
            {openKala
              ? KALA_SUBS.map((row) => (
                  <MatrixRow
                    key={row.key}
                    rowIndex={matrixRowIndex++}
                    label={t(row.label)}
                    planets={ordered}
                    selectedKey={selectedKey}
                    value={(p) =>
                      row.key === "yuddha" && yuddha
                        ? fmt(yuddhaVirupasForPlanet(p, yuddha), digits)
                        : fmt(p.sub_balas?.kala?.[row.key], digits)
                    }
                    sub
                  />
                ))
              : null}
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.bala_chesta"), tFor("en", "kundali.x.bala_chesta"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.cheshta, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.bala_naisargika"), tFor("en", "kundali.x.bala_naisargika"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.naisargika, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.drishti"), tFor("en", "kundali.drishti"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.drik, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.total_pinda"), tFor("en", "kundali.total_pinda"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.total_virupas, digits)}
              bold
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.rupas"), tFor("en", "kundali.rupas"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.rupas, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.min_required"), tFor("en", "kundali.x.min_required"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.required / 60, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel(tFor(undefined, "kundali.x.strength_ratio"), tFor("en", "kundali.x.strength_ratio"))}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.ratio, digits, 4)}
              bold
            />
            {bhavaBala ? (
              <MatrixRow
                rowIndex={matrixRowIndex++}
                label={rowLabel(tFor(undefined, "kundali.x.bhava_percent"), tFor("en", "kundali.x.bhava_percent"))}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => {
                  const pct = bhavaBala.rulershipPercent[p.key];
                  return pct != null ? `${digits(pct.toFixed(1))}%` : "—";
                }}
                bold
              />
            ) : null}
            {hasPhala ? (
              <>
                <MatrixRow
                  rowIndex={matrixRowIndex++}
                  label={rowLabel(tFor(undefined, "kundali.x.ishta_phala"), tFor("en", "kundali.x.ishta_phala"))}
                  planets={ordered}
                  selectedKey={selectedKey}
                  value={(p) => fmt(p.ishta_phala, digits)}
                />
                <MatrixRow
                  rowIndex={matrixRowIndex++}
                  label={rowLabel(tFor(undefined, "kundali.x.kashta_phala"), tFor("en", "kundali.x.kashta_phala"))}
                  planets={ordered}
                  selectedKey={selectedKey}
                  value={(p) => fmt(p.kashta_phala, digits)}
                />
              </>
            ) : null}
            <TableRow rowIndex={matrixRowIndex++} borderTop>
              <View
                style={{
                  ...tableColumnLayout(TABLE_STRETCH, LABEL_COL),
                }}
                className="justify-center px-2.5 py-1.5"
              >
                <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(11)}>
                  {kundaliLabel("status", lang)}
                </Text>
              </View>
              {ordered.map((p) => (
                <View
                  key={p.key}
                  style={{
                    ...tableColumnLayout(TABLE_STRETCH, PLANET_COL),
                    backgroundColor: p.key === selectedKey ? colorWithAlpha(colors.primary, 0.1) : undefined,
                  }}
                  className="items-end justify-center px-1.5 py-1.5"
                >
                  <StatusBadge status={p.status} />
                </View>
              ))}
            </TableRow>
          </View>
        </TableScrollShell>

        <Text className={kundaliDetailClasses.glance.tableNote} style={nepaliTextStyle(11)}>
          {kundaliLabel("virupas_per_bala_note", lang)}
          {bhavaBala ? ` ${kundaliLabel("bhava_pct_row_note", lang)}` : null}
        </Text>

        {hasYuddhaActivity && yuddha ? (
          <Text className={kundaliDetailClasses.glance.warn} style={nepaliTextStyle(11)}>
            {kundaliLabel("graha_yuddha_detected", lang)}{" "}
            {yuddha.wars
              .map((w) =>
                pick(
                  tFor(undefined, "ui.kundali.x_b48812f0", { v0: grahaName(w.winner), v1: grahaName(w.loser), v2: fmt(w.yuddhaVirupas, digits), v3: digits(w.separationDeg.toFixed(2)) }),
                  `${grahaName(w.winner)} defeats ${grahaName(w.loser)} (${fmt(w.yuddhaVirupas, digits)} virupas, ${w.separationDeg.toFixed(2)}° apart)`,
                ),
              )
              .join("; ")}
            .
          </Text>
        ) : null}
      </View>
    </View>
  );
}
