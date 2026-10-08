import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@/lib/api";
import type { GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { NAVAGRAHA_SHANTI, getGrahaShanti } from "@/lib/shanti/navagraha-shanti";
import {
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { scrollViewIntoView } from "@/lib/page-scroll";

function InfoTile({
  icon,
  label,
  value,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  width: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{ width: width as never }}
      className="flex-row items-start gap-2.5 rounded-lg border border-border bg-card p-3"
    >
      <Ionicons name={icon} size={16} color={colors.secondary} style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1">
        <Text
          className="text-xs uppercase tracking-wide text-muted-foreground"
          style={nepaliTextStyle(11)}
        >
          {label}
        </Text>
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const REMEDY_BADGE: Record<GrahaShantiFinding["remedy"], { border: string; bg: string; text: string }> = {
  shanti: { border: "#0b565a", bg: "#0b565a1a", text: "#0b565a" },
  strengthen: { border: "#10b98166", bg: "#10b9811a", text: "#059669" },
  pacify: { border: "#f59e0b66", bg: "#f59e0b1a", text: "#d97706" },
  pacify_transit: { border: "#f59e0b66", bg: "#f59e0b1a", text: "#d97706" },
  soothe: { border: "#0ea5e966", bg: "#0ea5e91a", text: "#0284c7" },
};

/**
 * One trigger of the server-computed classical 4-step Graha Shanti decision
 * process (see `GrahaShantiFinding`) — not a client-side heuristic.
 */
function ShantiFindingCard({
  finding,
  onSelect,
  width,
}: {
  finding: GrahaShantiFinding;
  onSelect: (key: string) => void;
  width: string;
}) {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const graha = getGrahaShanti(finding.graha);
  const nameNe = graha?.nameNe ?? finding.grahaNe;
  const nameEn = graha?.nameEn ?? finding.graha;
  const badge = REMEDY_BADGE[finding.remedy];

  return (
    <View style={{ width: width as never }} className="rounded-xl border border-border bg-card p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text
          className="shrink text-xs uppercase tracking-wide text-muted-foreground"
          style={nepaliTextStyle(11)}
        >
          {pick(finding.stepTitleNe, finding.stepTitleEn)}
        </Text>
        <View
          style={{ borderColor: badge.border, backgroundColor: badge.bg }}
          className="rounded-full border px-2.5 py-0.5"
        >
          <Text className="text-xs font-semibold" style={[nepaliTextStyle(12), { color: badge.text }]}>
            {t(`kundali.x.shanti_remedy_${finding.remedy}`)}
          </Text>
        </View>
      </View>
      <View className="mt-1.5 flex-row items-center gap-2">
        <GrahaPlanetIcon graha={finding.graha as GrahaKey} size={28} />
        <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(18)}>
          {pick(nameNe, nameEn)}
        </Text>
      </View>
      <Text className="mt-1 text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
        {pick(finding.reasonNe, finding.reasonEn)}
      </Text>
      <Pressable
        onPress={() => onSelect(finding.graha)}
        style={{ backgroundColor: colorWithAlpha("#0b565a", 0.1) }}
        className="mt-3 flex-row items-center gap-1.5 self-start rounded-lg border border-secondary px-3 py-1.5 active:opacity-80"
      >
        <Ionicons name="arrow-down-circle-outline" size={14} color={colors.secondary} />
        <Text className="text-sm text-secondary" style={nepaliTextStyle(13)}>
          {pick(`${nameNe} शान्ति हेर्नुहोस्`, `View ${nameEn} shanti`)}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One tier ("critical" or "core") of findings, collapsible so a chart with
 * many simultaneous afflictions (a real stellium can produce 8-12 findings)
 * doesn't dump every card on the user at once.
 */
function ShantiFindingsGroup({
  title,
  findings,
  onSelect,
  defaultOpen,
  cardWidth,
}: {
  title: string;
  findings: GrahaShantiFinding[];
  onSelect: (key: string) => void;
  defaultOpen: boolean;
  cardWidth: string;
}) {
  const { digits } = useLocale();
  const colors = useThemeColors();
  const [open, setOpen] = useState(defaultOpen);
  if (findings.length === 0) return null;
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 active:opacity-80"
      >
        <Text className="flex-1 text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {title} ({digits(findings.length)})
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>
      {open ? (
        <View className="mt-3 flex-row flex-wrap gap-3">
          {findings.map((finding, idx) => (
            <ShantiFindingCard
              key={`${finding.step}-${finding.graha}-${finding.remedy}-${idx}`}
              finding={finding}
              onSelect={onSelect}
              width={cardWidth}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Navagraha Shanti recommendations + reference. `grahaShanti` is the
 * server-computed classical 4-step decision (dasha assessment, Lagnesha/
 * Yogakaraka strength, Rahu-Ketu-Saturn affliction, Saturn's Sade Sati/
 * Dhaiya transit) — see `GrahaShantiRecommendation` in `lib/api.ts`. Used
 * standalone (shanti-vidhi screen) and embedded in each kundali. No data
 * fetching of its own.
 */
export function ShantiVidhiPanel({
  grahaShanti,
  isError = false,
}: {
  grahaShanti?: GrahaShantiRecommendation;
  isError?: boolean;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const [selectedKey, setSelectedKey] = useState("saturn");
  const graha = useMemo(
    () => getGrahaShanti(selectedKey) ?? NAVAGRAHA_SHANTI[0],
    [selectedKey],
  );
  const detailRef = useRef<View>(null);
  const selectAndScroll = (key: string) => {
    setSelectedKey(key);
    requestAnimationFrame(() => scrollViewIntoView(detailRef.current));
  };
  const findings = useMemo(() => grahaShanti?.findings ?? [], [grahaShanti]);
  const criticalFindings = useMemo(() => findings.filter((f) => f.tier === "critical"), [findings]);
  const coreFindings = useMemo(() => findings.filter((f) => f.tier === "core"), [findings]);

  // Web uses sm:grid-cols-2 for the recommendation/tile grids and
  // grid-cols-3 / sm:grid-cols-5 / lg:grid-cols-9 for the graha selector.
  const cardWidth = width >= 640 ? "49%" : "100%";
  const tileWidth = width >= 1024 ? "32%" : width >= 640 ? "49%" : "100%";
  const selectorCols = width >= 1024 ? 9 : width >= 640 ? 5 : 3;
  const selectorWidth = `${(100 / selectorCols - 1.5).toFixed(2)}%`;

  const daanItems = lang === "en" ? graha.daanEn ?? graha.daan : graha.daan;

  return (
    <View className="gap-4">
      {/* recommendations from this chart — server-computed 4-step decision */}
      {isError ? (
        <View
          style={{ backgroundColor: colorWithAlpha("#c62828", 0.1) }}
          className="rounded-lg border border-destructive/30 p-3"
        >
          <Text className="text-sm text-destructive" style={nepaliTextStyle(14)}>
            {t("kundali.x.shanti_load_error")}
          </Text>
        </View>
      ) : findings.length > 0 ? (
        <View className="gap-3">
          <ShantiFindingsGroup
            title={t("kundali.x.shanti_tier_critical")}
            findings={criticalFindings}
            onSelect={selectAndScroll}
            defaultOpen
            cardWidth={cardWidth}
          />
          <ShantiFindingsGroup
            title={t("kundali.x.shanti_tier_core")}
            findings={coreFindings}
            onSelect={selectAndScroll}
            defaultOpen={criticalFindings.length === 0}
            cardWidth={cardWidth}
          />
        </View>
      ) : (
        <View className="rounded-lg border border-border bg-card p-3">
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("kundali.x.shanti_findings_empty")}
          </Text>
        </View>
      )}
      <Text className="text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
        {t("kundali.x.shanti_basis_note")}
      </Text>

      {/* graha selector */}
      <View className="flex-row flex-wrap gap-2">
        {NAVAGRAHA_SHANTI.map((g) => {
          const active = g.key === selectedKey;
          return (
            <Pressable
              key={g.key}
              onPress={() => setSelectedKey(g.key)}
              style={{
                width: selectorWidth as never,
                backgroundColor: active ? colorWithAlpha("#0b565a", 0.1) : colors.card,
                borderColor: active ? colors.secondary : colors.border,
              }}
              className="items-center gap-1 rounded-xl border p-3 active:opacity-80"
            >
              <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs font-semibold",
                  active ? "text-secondary" : "text-foreground",
                )}
                style={nepaliTextStyle(12)}
              >
                {pick(g.nameNe, g.nameEn)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* selected graha detail */}
      <View ref={detailRef} collapsable={false} className="overflow-hidden rounded-2xl border border-border">
        <LinearGradient
          colors={[`${graha.colorHex}1f`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className="flex-row flex-wrap items-center gap-3 border-b border-border p-5">
            <View
              style={{ backgroundColor: graha.colorHex }}
              className="h-10 w-1.5 self-stretch rounded-full"
            />
            <GrahaPlanetIcon graha={graha.key as GrahaKey} size={40} />
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(18)}>
                {pick(`${graha.nameNe} शान्ति`, `${graha.nameEn} Shanti`)}
              </Text>
              <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
                {pick(graha.nameEn, graha.nameNe)}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <View className="flex-row items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.vaaraNe, graha.vaaraEn)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.shubhSamayaNe, graha.shubhSamayaEn)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
                <View
                  style={{ backgroundColor: graha.colorHex }}
                  className="h-2.5 w-2.5 rounded-full"
                />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.colorNe, graha.colorEn)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="gap-5 p-5">
          {/* mantra + japa */}
          <View className="rounded-xl border border-border bg-muted/30 p-4">
            <Text
              className="mb-1 text-xs uppercase tracking-wide text-muted-foreground"
              style={nepaliTextStyle(11)}
            >
              {t("kundali.x.shanti_beeja_mantra_heading")}
            </Text>
            <Text
              className="text-lg font-semibold leading-relaxed text-foreground"
              style={nepaliTextStyle(18)}
            >
              {graha.beejMantra}
            </Text>
            <Text className="mt-1.5 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick(
                `जप संख्या: ${digits(graha.japa)} पटक (${t("kundali.x.shanti_kaliyuga_japa")}: ${digits(graha.japa * 4)} पटक)`,
                `Japa count: ${digits(graha.japa)} times (${t("kundali.x.shanti_kaliyuga_japa")}: ${digits(graha.japa * 4)} times)`,
              )}
            </Text>
            <View className="mt-3 border-t border-border pt-3">
              <Text
                className="mb-1 text-xs uppercase tracking-wide text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_vedic_mantra_heading")}
              </Text>
              <Text className="text-sm leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
                {graha.vedicMantra}
              </Text>
            </View>
            <View className="mt-3 border-t border-border pt-3">
              <Text
                className="mb-1 text-xs uppercase tracking-wide text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_tantrik_mantra_heading")}
              </Text>
              <Text
                className="text-lg font-semibold leading-relaxed text-foreground"
                style={nepaliTextStyle(18)}
              >
                {graha.tantrikMantra}
              </Text>
            </View>
          </View>

          {/* stotram + yantra */}
          <View className="gap-3">
            <View className="rounded-xl border border-border bg-card p-4">
              <View className="mb-1 flex-row items-center gap-1.5">
                <Ionicons name="book-outline" size={16} color={colors.secondary} />
                <Text
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                  style={nepaliTextStyle(11)}
                >
                  {t("kundali.x.shanti_stotram_heading")}
                </Text>
              </View>
              <Text className="text-base italic leading-relaxed text-foreground" style={nepaliTextStyle(16)}>
                {graha.stotram}
              </Text>
            </View>
            <View className="rounded-xl border border-border bg-card p-4">
              <Text
                className="mb-2 text-center text-xs uppercase tracking-wide text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_yantra_heading")}
              </Text>
              <View className="mx-auto w-32 flex-row flex-wrap gap-1">
                {graha.yantraGrid.map((n, i) => (
                  <View
                    key={i}
                    style={{ width: "31%", aspectRatio: 1 }}
                    className="items-center justify-center rounded border border-border bg-background"
                  >
                    <Text className="text-sm font-semibold text-foreground">{digits(n)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* tiles */}
          <View className="flex-row flex-wrap gap-3">
            <InfoTile
              width={tileWidth}
              icon="leaf-outline"
              label={t("kundali.x.shanti_samidha_heading")}
              value={pick(graha.samidhaNe, graha.samidhaEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="diamond-outline"
              label={t("kundali.x.shanti_gem")}
              value={pick(graha.gemNe, graha.gemEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="sparkles-outline"
              label={t("kundali.x.shanti_metal")}
              value={pick(graha.metalNe, graha.metalEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="flame-outline"
              label={t("kundali.x.shanti_deity")}
              value={pick(graha.adhidevataNe, graha.adhidevataEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="person-outline"
              label={t("kundali.x.shanti_pratyadhidevata")}
              value={pick(graha.pratyadhidevataNe, graha.pratyadhidevataEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="compass-outline"
              label={t("kundali.x.shanti_disha")}
              value={pick(graha.dishaNe, graha.dishaEn)}
            />
            <InfoTile
              width={tileWidth}
              icon="flower-outline"
              label={t("kundali.x.shanti_pooja")}
              value={pick(graha.poojaNe, graha.poojaEn)}
            />
          </View>

          {/* gem-wearing method */}
          <View className="rounded-lg border border-border bg-card p-3">
            <Text className="text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
              <Text className="font-semibold text-foreground">{t("kundali.x.shanti_gem_detail_label")}</Text>{" "}
              {pick(graha.gemDetailNe, graha.gemDetailEn)}
            </Text>
          </View>

          {/* daan */}
          <View>
            <View className="mb-2 flex-row items-center gap-1.5">
              <Ionicons name="gift-outline" size={16} color={colors.secondary} />
              <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
                {t("kundali.x.shanti_donation_items")}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {daanItems.map((item, idx) => (
                <View
                  key={`${item}-${idx}`}
                  className="rounded-full border border-border bg-card px-3 py-1"
                >
                  <Text className="text-sm text-foreground" style={nepaliTextStyle(13)}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-lg border border-border bg-card p-3">
            <Text className="text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
              <Text className="font-semibold text-foreground">{t("kundali.x.shanti_use_label")}</Text>{" "}
              {pick(graha.remedyNe, graha.remedyEn)}
            </Text>
          </View>
        </View>
      </View>

      {/* full reference table */}
      <View>
        <Text className="mb-3 text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
          {t("kundali.x.shanti_reference_table")}
        </Text>
        <TableScrollShell>
          <TableHeader>
            {SHANTI_COLUMNS.map((col) => (
              <TableHeaderCell key={col.key} width={col.width} compact>
                <TableHeaderLabel compact>{pick(col.ne, col.en)}</TableHeaderLabel>
              </TableHeaderCell>
            ))}
          </TableHeader>
          {NAVAGRAHA_SHANTI.map((g, rowIndex) => {
            const active = g.key === selectedKey;
            return (
              <TableRow
                key={g.key}
                rowIndex={rowIndex}
                highlight={active}
                onPress={() => setSelectedKey(g.key)}
              >
                    <Cell width={SHANTI_COLUMNS[0].width} bold>
                      <View className="flex-row items-center gap-1.5">
                        <GrahaPlanetIcon graha={g.key as GrahaKey} size={22} />
                        <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(12)}>
                          {pick(g.nameNe, g.nameEn)}
                        </Text>
                      </View>
                    </Cell>
                    <Cell width={SHANTI_COLUMNS[1].width}>{pick(g.vaaraNe, g.vaaraEn)}</Cell>
                    <Cell width={SHANTI_COLUMNS[2].width}>{g.beejMantra}</Cell>
                    <Cell width={SHANTI_COLUMNS[3].width}>{digits(g.japa)}</Cell>
                    <Cell width={SHANTI_COLUMNS[4].width}>{pick(g.samidhaNe, g.samidhaEn)}</Cell>
                    <Cell width={SHANTI_COLUMNS[5].width}>{pick(g.gemNe, g.gemEn)}</Cell>
                    <Cell width={SHANTI_COLUMNS[6].width}>{pick(g.metalNe, g.metalEn)}</Cell>
                    <Cell width={SHANTI_COLUMNS[7].width}>
                      {pick(g.daan.join(", "), g.daanEn.join(", "))}
                    </Cell>
              </TableRow>
            );
          })}
        </TableScrollShell>
        <Text className="mt-2 text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
          {t("kundali.x.shanti_disclaimer")}
        </Text>
      </View>
    </View>
  );
}

const SHANTI_COLUMNS = [
  { key: "graha", ne: "ग्रह", en: "Planet", width: 92 },
  { key: "vaara", ne: "बार", en: "Day", width: 92 },
  { key: "mantra", ne: "बीज मन्त्र", en: "Beeja mantra", width: 168 },
  { key: "japa", ne: "जप", en: "Japa", width: 68 },
  { key: "samidha", ne: "समिधा", en: "Samidha", width: 110 },
  { key: "gem", ne: "रत्न", en: "Gem", width: 110 },
  { key: "metal", ne: "धातु", en: "Metal", width: 96 },
  { key: "daan", ne: "दान", en: "Daan", width: 220 },
] as const;

function Cell({
  width,
  bold,
  children,
}: {
  width: number;
  bold?: boolean;
  children: React.ReactNode;
}) {
  if (typeof children === "string" || typeof children === "number") {
    return (
      <Text
        style={{ width, ...nepaliTextStyle(12) }}
        className={cn(
          "px-2.5 py-2 text-xs",
          bold ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
      </Text>
    );
  }
  return (
    <View style={{ width }} className="justify-center px-2.5 py-2">
      {children}
    </View>
  );
}

export default ShantiVidhiPanel;
