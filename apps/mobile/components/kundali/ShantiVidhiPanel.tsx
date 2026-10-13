import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { NAVAGRAHA_SHANTI, getGrahaShanti } from "@vedic-patro/domain/shanti/navagraha-shanti";
import {
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { scrollViewIntoView } from "@/lib/page-scroll";
import { space } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

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
      className={sh.tile}
    >
      <Ionicons name={icon} size={16} color={colors.secondary} style={{ marginTop: space.hair }} />
      <View className="min-w-0 flex-1">
        <Text className={sh.tileLabel} style={nepaliTextStyle(11)}>
          {label}
        </Text>
        <Text className={sh.tileValue} style={nepaliTextStyle(14)}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const sh = kundaliDetailClasses.shanti;

const REMEDY_BADGE: Record<GrahaShantiFinding["remedy"], { box: string; text: string }> = {
  shanti: { box: sh.remedyShanti, text: sh.remedyShantiText },
  strengthen: { box: sh.remedyStrengthen, text: sh.remedyStrengthenText },
  pacify: { box: sh.remedyPacify, text: sh.remedyPacifyText },
  pacify_transit: { box: sh.remedyPacify, text: sh.remedyPacifyText },
  soothe: { box: sh.remedySoothe, text: sh.remedySootheText },
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
    <View style={{ width: width as never }} className={sh.finding}>
      <View className={sh.findingHead}>
        <Text
          className={cn(sh.findingStep, "shrink")}
          style={nepaliTextStyle(11)}
        >
          {pick(finding.stepTitleNe, finding.stepTitleEn)}
        </Text>
        <View className={cn(sh.remedyBadge, badge.box)}>
          <Text className={cn(sh.remedyBadgeText, badge.text)} style={nepaliTextStyle(12)}>
            {t(`kundali.x.shanti_remedy_${finding.remedy}`)}
          </Text>
        </View>
      </View>
      <View className={sh.findingGraha}>
        <GrahaPlanetIcon graha={finding.graha as GrahaKey} size={28} />
        <Text className={sh.findingName} style={nepaliTextStyle(18)}>
          {pick(nameNe, nameEn)}
        </Text>
      </View>
      <Text className={sh.findingReason} style={nepaliTextStyle(14)}>
        {pick(finding.reasonNe, finding.reasonEn)}
      </Text>
      <Pressable
        onPress={() => onSelect(finding.graha)}
        className={cn(sh.findingButton, "self-start active:opacity-80")}
      >
        <Ionicons name="arrow-down-circle-outline" size={14} color={colors.secondary} />
        <Text className={sh.findingButtonText} style={nepaliTextStyle(13)}>
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
        className={cn(sh.groupToggle, "active:opacity-80")}
      >
        <Text className={cn(sh.groupToggleText, "flex-1")} style={nepaliTextStyle(14)}>
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
    <View className={sh.root}>
      {/* recommendations from this chart — server-computed 4-step decision */}
      {isError ? (
        <View className={sh.errorBox}>
          <Text className={sh.errorText} style={nepaliTextStyle(14)}>
            {t("kundali.x.shanti_load_error")}
          </Text>
        </View>
      ) : findings.length > 0 ? (
        <View className={sh.findingsList}>
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
        <View className={sh.emptyBox}>
          <Text className={sh.emptyText} style={nepaliTextStyle(14)}>
            {t("kundali.x.shanti_findings_empty")}
          </Text>
        </View>
      )}
      <Text className={sh.basisNote} style={nepaliTextStyle(14)}>
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
              style={{ width: selectorWidth as never }}
              className={cn(
                sh.selector,
                "active:opacity-80",
                active ? sh.selectorActive : sh.selectorIdle,
              )}
            >
              <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
              <Text
                numberOfLines={1}
                className={cn(
                  sh.selectorText,
                  active ? sh.selectorTextActive : sh.selectorTextIdle,
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
      <View ref={detailRef} collapsable={false} className={sh.detail}>
        <LinearGradient
          colors={[`${graha.colorHex}1f`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className={sh.detailHead}>
            <View
              style={{ backgroundColor: graha.colorHex }}
              className="h-10 w-1.5 self-stretch rounded-full"
            />
            <GrahaPlanetIcon graha={graha.key as GrahaKey} size={40} />
            <View className="min-w-0 flex-1">
              <Text className={sh.detailTitle} style={nepaliTextStyle(18)}>
                {pick(`${graha.nameNe} शान्ति`, `${graha.nameEn} Shanti`)}
              </Text>
              <Text className={sh.detailSubtitle} style={nepaliTextStyle(12)}>
                {pick(graha.nameEn, graha.nameNe)}
              </Text>
            </View>
            <View className={sh.pills}>
              <View className={sh.pill}>
                <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.vaaraNe, graha.vaaraEn)}
                </Text>
              </View>
              <View className={sh.pill}>
                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.shubhSamayaNe, graha.shubhSamayaEn)}
                </Text>
              </View>
              <View className={cn(sh.pill, "gap-1.5")}>
                <View
                  style={{ backgroundColor: graha.colorHex }}
                  className={sh.colorDot}
                />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {pick(graha.colorNe, graha.colorEn)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className={sh.detailBody}>
          {/* mantra + japa */}
          <View className={sh.mantraBox}>
            <Text
              className={sh.mantraLabel}
              style={nepaliTextStyle(11)}
            >
              {t("kundali.x.shanti_beeja_mantra_heading")}
            </Text>
            <Text
              className={sh.mantraBig}
              style={nepaliTextStyle(18)}
            >
              {graha.beejMantra}
            </Text>
            <Text className={sh.japa} style={nepaliTextStyle(14)}>
              {t("ui.kundali.japa_count_japa_times_value_value2", { japa: digits(graha.japa), value: t("kundali.x.shanti_kaliyuga_japa"), value2: digits(graha.japa * 4) })}
            </Text>
            <View className={sh.mantraSection}>
              <Text
                className={sh.mantraLabel}
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_vedic_mantra_heading")}
              </Text>
              <Text className={sh.vedic} style={nepaliTextStyle(14)}>
                {graha.vedicMantra}
              </Text>
            </View>
            <View className={sh.mantraSection}>
              <Text
                className={sh.mantraLabel}
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_tantrik_mantra_heading")}
              </Text>
              <Text
                className={sh.mantraBig}
                style={nepaliTextStyle(18)}
              >
                {graha.tantrikMantra}
              </Text>
            </View>
          </View>

          {/* stotram + yantra */}
          <View className="gap-3">
            <View className={sh.stotramBox}>
              <View className={sh.stotramHead}>
                <Ionicons name="book-outline" size={16} color={colors.secondary} />
                <Text
                  className={sh.tileLabel}
                  style={nepaliTextStyle(11)}
                >
                  {t("kundali.x.shanti_stotram_heading")}
                </Text>
              </View>
              <Text className={sh.stotram} style={nepaliTextStyle(16)}>
                {graha.stotram}
              </Text>
            </View>
            <View className={sh.stotramBox}>
              <Text
                className={sh.yantraLabel}
                style={nepaliTextStyle(11)}
              >
                {t("kundali.x.shanti_yantra_heading")}
              </Text>
              <View className="mx-auto w-32 flex-row flex-wrap gap-1">
                {graha.yantraGrid.map((n, i) => (
                  <View
                    key={i}
                    style={{ width: "31%", aspectRatio: 1 }}
                    className={sh.yantraCell}
                  >
                    <Text className={sh.yantraText}>{digits(n)}</Text>
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
          <View className={sh.noteBox}>
            <Text className={sh.noteText} style={nepaliTextStyle(14)}>
              <Text className={sh.noteLabel}>{t("kundali.x.shanti_gem_detail_label")}</Text>{" "}
              {pick(graha.gemDetailNe, graha.gemDetailEn)}
            </Text>
          </View>

          {/* daan */}
          <View>
            <View className={sh.donationHead}>
              <Ionicons name="gift-outline" size={16} color={colors.secondary} />
              <Text className={sh.donationTitle} style={nepaliTextStyle(14)}>
                {t("kundali.x.shanti_donation_items")}
              </Text>
            </View>
            <View className={sh.donationList}>
              {daanItems.map((item, idx) => (
                <View
                  key={`${item}-${idx}`}
                  className={sh.donationChip}
                >
                  <Text className={sh.donationChipText} style={nepaliTextStyle(13)}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className={sh.noteBox}>
            <Text className={sh.noteText} style={nepaliTextStyle(14)}>
              <Text className={sh.noteLabel}>{t("kundali.x.shanti_use_label")}</Text>{" "}
              {pick(graha.remedyNe, graha.remedyEn)}
            </Text>
          </View>
        </View>
      </View>

      {/* full reference table */}
      <View>
        <Text className={sh.refTitle} style={nepaliTextStyle(16)}>
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
                        <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(12)}>
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
        <Text className={sh.refNote} style={nepaliTextStyle(14)}>
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
          "px-2.5 py-2 text-sm",
          bold ? "font-semibold text-foreground" : "text-foreground",
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
