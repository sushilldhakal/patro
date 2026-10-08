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
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { KALA_SUBS, STHANA_SUBS, orderShadbalaPlanets, yuddhaVirupasForPlanet } from "@/lib/kundali/shadbala-display";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const STATUS_ORDER: ShadbalaStatus[] = [
  "Exceptional",
  "Strong",
  "Adequate",
  "Borderline",
  "Weak",
];

const STATUS_LABEL: Record<ShadbalaStatus, { ne: string; en: string }> = {
  Exceptional: { ne: "उत्कृष्ट", en: "Exceptional" },
  Strong: { ne: "बलियो", en: "Strong" },
  Adequate: { ne: "पर्याप्त", en: "Adequate" },
  Borderline: { ne: "सीमान्त", en: "Borderline" },
  Weak: { ne: "कमजोर", en: "Weak" },
};

const STATUS_COLORS: Record<ShadbalaStatus, string> = {
  Exceptional: "#10b981",
  Strong: "#0ea5e9",
  Adequate: "#f59e0b",
  Borderline: "#f97316",
  Weak: "#dc2626",
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

function fmt(value: number | undefined, digits: (v: string | number) => string, places = 2): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(places);
  const signed = value < 0 ? `−${abs}` : abs;
  return digits(signed);
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
      className="self-end rounded-full border px-2 py-0.5"
    >
      <Text style={{ color, ...nepaliTextStyle(11) }} className="text-xs font-semibold">
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
  const colors = useThemeColors();
  return (
    <View
      style={[{ borderColor: colors.border }, layout]}
      className="rounded-xl border bg-card p-3"
    >
      <Text
        className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        style={nepaliTextStyle(11)}
      >
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
        paddingHorizontal: sub ? 20 : 10,
        paddingVertical: 6,
        backgroundColor: sub ? colorWithAlpha(colors.muted, 0.35) : undefined,
      }}
      className="justify-center"
    >
      {expandable ? (
        <Pressable onPress={onToggle} className="flex-row items-center gap-1 active:opacity-70">
          <Ionicons
            name={open ? "chevron-down" : "chevron-forward"}
            size={14}
            color={colors.foreground}
          />
          <Text
            className={cn("text-foreground", bold || expandable ? "font-semibold" : "")}
            style={nepaliTextStyle(11)}
            numberOfLines={2}
          >
            {label}
          </Text>
        </Pressable>
      ) : (
        <Text
          className={cn("text-foreground", sub ? "" : "font-semibold")}
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
            paddingHorizontal: 6,
            paddingVertical: 6,
            backgroundColor: selectedKey === p.key ? colorWithAlpha(colors.primary, 0.1) : undefined,
          }}
          className="items-end justify-center"
        >
          {typeof value(p) === "string" || typeof value(p) === "number" ? (
            <Text
              className={cn("font-num text-foreground", bold ? "font-semibold" : "text-foreground/90")}
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
  const { lang, pick, digits } = useLocale();
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
          <Text
            className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground"
            style={nepaliTextStyle(13)}
          >
            {kundaliLabel("shadbala_planetary_strength_virupas", lang)}
          </Text>
        ) : null}
        <Text className="mb-3 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick("पाराशरी षड्बल (लाहिरी निरयण, जेपीएल)", data.method)}
        </Text>

        <View className="flex-row flex-wrap" style={{ gap: GLANCE_GAP }}>
          <GlanceTile layout={tileLayout} label={kundaliLabel("strongest_planet", lang)}>
            <View className="flex-row flex-wrap items-center gap-2">
              <GrahaPlanetIcon graha={summary.strongest.key as GrahaKey} size={28} />
              <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(17)}>
                {lang === "en" ? summary.strongest.name : summary.strongest.name_ne}
              </Text>
            </View>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              <StatusBadge status={summary.strongest.status} />
              <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
                {pick(
                  `${digits(summary.strongest.ratio.toFixed(2))}× आवश्यक`,
                  `${summary.strongest.ratio.toFixed(2)}x required`,
                )}
              </Text>
            </View>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("weakest_planet", lang)}>
            <View className="flex-row flex-wrap items-center gap-2">
              <GrahaPlanetIcon graha={summary.weakest.key as GrahaKey} size={28} />
              <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(17)}>
                {lang === "en" ? summary.weakest.name : summary.weakest.name_ne}
              </Text>
            </View>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              <StatusBadge status={summary.weakest.status} />
              <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
                {pick(
                  `${digits(summary.weakest.ratio.toFixed(2))}× आवश्यक`,
                  `${summary.weakest.ratio.toFixed(2)}x required`,
                )}
              </Text>
            </View>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("average_rupas", lang)}>
            <Text className="font-num text-2xl font-bold text-foreground" style={nepaliTextStyle(22)}>
              {digits(summary.average_rupas.toFixed(2))}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
              {digits(summary.average_virupas.toFixed(2))} {kundaliLabel("virupas", lang)}
            </Text>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={kundaliLabel("planets_meeting_threshold", lang)}>
            <Text className="font-num text-2xl font-bold text-foreground" style={nepaliTextStyle(22)}>
              {digits(summary.meeting_threshold)}
              <Text className="text-sm text-muted-foreground"> / {digits(summary.total_planets)}</Text>
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
              {kundaliLabel("adequate_or_stronger", lang)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
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
                    className="flex-row items-center gap-1 rounded-full border px-1.5 py-0.5"
                  >
                    <Text
                      style={{ color: active ? color : colors.mutedForeground, ...nepaliTextStyle(10) }}
                      className="text-[12px]"
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
        <Text className="mb-2 text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
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
              label={rowLabel("सापेक्ष क्रम", "Relative Rank")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => digits(String(rankByKey.get(p.key) ?? "—"))}
              bold
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("स्थान", "Sthana")}
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
                    label={pick(row.ne, row.en)}
                    planets={ordered}
                    selectedKey={selectedKey}
                    value={(p) => fmt(p.sub_balas?.sthana?.[row.key], digits)}
                    sub
                  />
                ))
              : null}
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("दिशा", "Disha")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.dig, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("काल", "Kala")}
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
                    label={pick(row.ne, row.en)}
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
              label={rowLabel("चेष्टा", "Chesta")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.cheshta, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("नैसर्गिक", "Naisargika")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.naisargika, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("दृष्टि", "Drishti")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.breakdown.drik, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("कुल पिण्ड", "Total Pinda")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.total_virupas, digits)}
              bold
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("रूप", "Rupas")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.rupas, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("न्यूनतम आवश्यक", "Min. Require")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.required / 60, digits)}
            />
            <MatrixRow
              rowIndex={matrixRowIndex++}
              label={rowLabel("शक्ति अनुपात", "Strength Ratio")}
              planets={ordered}
              selectedKey={selectedKey}
              value={(p) => fmt(p.ratio, digits, 4)}
              bold
            />
            {bhavaBala ? (
              <MatrixRow
                rowIndex={matrixRowIndex++}
                label={rowLabel("भाव (% मा)", "Bhava (in %)")}
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
                  label={rowLabel("इष्ट फल", "Ishta Phala")}
                  planets={ordered}
                  selectedKey={selectedKey}
                  value={(p) => fmt(p.ishta_phala, digits)}
                />
                <MatrixRow
                  rowIndex={matrixRowIndex++}
                  label={rowLabel("कष्ट फल", "Kashta Phala")}
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
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
                className="justify-center"
              >
                <Text className="font-semibold text-foreground" style={nepaliTextStyle(11)}>
                  {kundaliLabel("status", lang)}
                </Text>
              </View>
              {ordered.map((p) => (
                <View
                  key={p.key}
                  style={{
                    ...tableColumnLayout(TABLE_STRETCH, PLANET_COL),
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                    backgroundColor: p.key === selectedKey ? colorWithAlpha(colors.primary, 0.1) : undefined,
                  }}
                  className="items-end justify-center"
                >
                  <StatusBadge status={p.status} />
                </View>
              ))}
            </TableRow>
          </View>
        </TableScrollShell>

        <Text className="mt-2 text-xs leading-relaxed text-muted-foreground" style={nepaliTextStyle(11)}>
          {kundaliLabel("virupas_per_bala_note", lang)}
          {bhavaBala ? ` ${kundaliLabel("bhava_pct_row_note", lang)}` : null}
        </Text>

        {hasYuddhaActivity && yuddha ? (
          <Text className="mt-1 text-xs text-amber-600" style={nepaliTextStyle(11)}>
            {kundaliLabel("graha_yuddha_detected", lang)}{" "}
            {yuddha.wars
              .map((w) =>
                pick(
                  `${grahaName(w.winner)} ले ${grahaName(w.loser)} लाई पराजित (${fmt(w.yuddhaVirupas, digits)} विरुप, ${digits(w.separationDeg.toFixed(2))}° को दूरी)`,
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
