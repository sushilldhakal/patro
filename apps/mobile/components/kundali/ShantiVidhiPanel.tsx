import { useRef } from "react";
import { Trans } from "@vedic-patro/i18n/react";
import { useShantiVidhiPanel, type ShantiFindingCard as ShantiFindingCardData } from "@vedic-patro/features/shanti";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
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

type TileKey = ReturnType<typeof useShantiVidhiPanel>["detail"]["tiles"][number]["key"];
const TILE_ICONS: Record<TileKey, keyof typeof Ionicons.glyphMap> = {
  samidha: "leaf-outline",
  gem: "diamond-outline",
  metal: "sparkles-outline",
  deity: "flame-outline",
  pratyadhidevata: "person-outline",
  disha: "compass-outline",
  pooja: "flower-outline",
};

/** Reference table column widths (graha, vaara, mantra, japa, samidha, gem, metal, daan). */
const SHANTI_COLUMN_WIDTHS = [92, 92, 168, 68, 110, 110, 96, 220] as const;

/**
 * One trigger of the server-computed classical 4-step Graha Shanti decision
 * process (see `GrahaShantiFinding`) — not a client-side heuristic.
 */
function ShantiFindingCard({
  card,
  onSelect,
  width,
}: {
  card: ShantiFindingCardData;
  onSelect: (key: string) => void;
  width: string;
}) {
  const colors = useThemeColors();
  const badge = REMEDY_BADGE[card.remedy];

  return (
    <View style={{ width: width as never }} className={sh.finding}>
      <View className={sh.findingHead}>
        <Text className={cn(sh.findingStep, "shrink")} style={nepaliTextStyle(11)}>
          {card.step}
        </Text>
        <View className={cn(sh.remedyBadge, badge.box)}>
          <Text className={cn(sh.remedyBadgeText, badge.text)} style={nepaliTextStyle(12)}>
            {card.remedyLabel}
          </Text>
        </View>
      </View>
      <View className={sh.findingGraha}>
        <GrahaPlanetIcon graha={card.graha as GrahaKey} size={28} />
        <Text className={sh.findingName} style={nepaliTextStyle(18)}>
          {card.name}
        </Text>
      </View>
      <Text className={sh.findingReason} style={nepaliTextStyle(14)}>
        {card.reason}
      </Text>
      <Pressable
        onPress={() => onSelect(card.graha)}
        className={cn(sh.findingButton, "self-start active:opacity-80")}
      >
        <Ionicons name="arrow-down-circle-outline" size={14} color={colors.secondary} />
        <Text className={sh.findingButtonText} style={nepaliTextStyle(13)}>
          {card.viewLabel}
        </Text>
      </Pressable>
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
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const detailRef = useRef<View>(null);
  const panel = useShantiVidhiPanel({
    grahaShanti,
    isError,
    scrollToDetail: () => scrollViewIntoView(detailRef.current),
  });
  const { detail, copy } = panel;

  // Web uses sm:grid-cols-2 for the recommendation/tile grids and
  // grid-cols-3 / sm:grid-cols-5 / lg:grid-cols-9 for the graha selector.
  const cardWidth = width >= 640 ? "49%" : "100%";
  const tileWidth = width >= 1024 ? "32%" : width >= 640 ? "49%" : "100%";
  const selectorCols = width >= 1024 ? 9 : width >= 640 ? 5 : 3;
  const selectorWidth = `${(100 / selectorCols - 1.5).toFixed(2)}%`;

  return (
    <View className={sh.root}>
      {/* recommendations from this chart — server-computed 4-step decision */}
      {panel.status === "error" ? (
        <View className={sh.errorBox}>
          <Text className={sh.errorText} style={nepaliTextStyle(14)}>
            {copy.loadError}
          </Text>
        </View>
      ) : panel.status === "findings" ? (
        <View className={sh.findingsList}>
          {panel.groups.map((group) => (
            // One tier of findings, collapsible so a chart with many
            // simultaneous afflictions doesn't dump every card at once.
            <View key={group.tier}>
              <Pressable
                onPress={group.toggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: group.open }}
                className={cn(sh.groupToggle, "active:opacity-80")}
              >
                <Text className={cn(sh.groupToggleText, "flex-1")} style={nepaliTextStyle(14)}>
                  {group.title}
                </Text>
                <Ionicons name={group.open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </Pressable>
              {group.open ? (
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {group.cards.map((card) => (
                    <ShantiFindingCard key={card.key} card={card} onSelect={panel.selectFinding} width={cardWidth} />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View className={sh.emptyBox}>
          <Text className={sh.emptyText} style={nepaliTextStyle(14)}>
            {copy.empty}
          </Text>
        </View>
      )}
      <Text className={sh.basisNote} style={nepaliTextStyle(14)}>
        {copy.basisNote}
      </Text>

      {/* graha selector */}
      <View className="flex-row flex-wrap gap-2">
        {panel.selector.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => panel.select(g.key)}
            style={{ width: selectorWidth as never }}
            className={cn(sh.selector, "active:opacity-80", g.active ? sh.selectorActive : sh.selectorIdle)}
          >
            <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
            <Text
              numberOfLines={1}
              className={cn(sh.selectorText, g.active ? sh.selectorTextActive : sh.selectorTextIdle)}
              style={nepaliTextStyle(12)}
            >
              {g.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* selected graha detail */}
      <View ref={detailRef} collapsable={false} className={sh.detail}>
        <LinearGradient
          colors={[`${detail.colorHex}1f`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className={sh.detailHead}>
            <View
              style={{ backgroundColor: detail.colorHex }}
              className="h-10 w-1.5 self-stretch rounded-full"
            />
            <GrahaPlanetIcon graha={detail.key as GrahaKey} size={40} />
            <View className="min-w-0 flex-1">
              <Text className={sh.detailTitle} style={nepaliTextStyle(18)}>
                {detail.title}
              </Text>
              <Text className={sh.detailSubtitle} style={nepaliTextStyle(12)}>
                {detail.subtitle}
              </Text>
            </View>
            <View className={sh.pills}>
              <View className={sh.pill}>
                <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {detail.vaara}
                </Text>
              </View>
              <View className={sh.pill}>
                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {detail.samaya}
                </Text>
              </View>
              <View className={cn(sh.pill, "gap-1.5")}>
                <View style={{ backgroundColor: detail.colorHex }} className={sh.colorDot} />
                <Text className="text-xs text-foreground" style={nepaliTextStyle(11)}>
                  {detail.color}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className={sh.detailBody}>
          {/* mantra + japa */}
          <View className={sh.mantraBox}>
            <Text className={sh.mantraLabel} style={nepaliTextStyle(11)}>
              {copy.beejaHeading}
            </Text>
            <Text className={sh.mantraBig} style={nepaliTextStyle(18)}>
              {detail.beejMantra}
            </Text>
            <Text className={sh.japa} style={nepaliTextStyle(14)}>
              <Trans
                i18nKey={detail.japaLine.i18nKey}
                values={detail.japaLine.values}
                components={{ v: <Text className={sh.japaValue} /> }}
              />
            </Text>
            <View className={sh.mantraSection}>
              <Text className={sh.mantraLabel} style={nepaliTextStyle(11)}>
                {copy.vedicHeading}
              </Text>
              <Text className={sh.vedic} style={nepaliTextStyle(14)}>
                {detail.vedicMantra}
              </Text>
            </View>
            <View className={sh.mantraSection}>
              <Text className={sh.mantraLabel} style={nepaliTextStyle(11)}>
                {copy.tantrikHeading}
              </Text>
              <Text className={sh.mantraBig} style={nepaliTextStyle(18)}>
                {detail.tantrikMantra}
              </Text>
            </View>
          </View>

          {/* stotram + yantra */}
          <View className="gap-3">
            <View className={sh.stotramBox}>
              <View className={sh.stotramHead}>
                <Ionicons name="book-outline" size={16} color={colors.secondary} />
                <Text className={sh.tileLabel} style={nepaliTextStyle(11)}>
                  {copy.stotramHeading}
                </Text>
              </View>
              <Text className={sh.stotram} style={nepaliTextStyle(16)}>
                {detail.stotram}
              </Text>
            </View>
            <View className={sh.stotramBox}>
              <Text className={sh.yantraLabel} style={nepaliTextStyle(11)}>
                {copy.yantraHeading}
              </Text>
              <View className="mx-auto w-32 flex-row flex-wrap gap-1">
                {detail.yantra.map((n, i) => (
                  <View key={i} style={{ width: "31%", aspectRatio: 1 }} className={sh.yantraCell}>
                    <Text className={sh.yantraText}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* tiles */}
          <View className="flex-row flex-wrap gap-3">
            {detail.tiles.map((tile) => (
              <InfoTile key={tile.key} width={tileWidth} icon={TILE_ICONS[tile.key]} label={tile.label} value={tile.value} />
            ))}
          </View>

          {/* gem-wearing method */}
          <View className={sh.noteBox}>
            <Text className={sh.noteText} style={nepaliTextStyle(14)}>
              <Text className={sh.noteLabel}>{copy.gemDetailLabel}</Text> {detail.gemDetail}
            </Text>
          </View>

          {/* daan */}
          <View>
            <View className={sh.donationHead}>
              <Ionicons name="gift-outline" size={16} color={colors.secondary} />
              <Text className={sh.donationTitle} style={nepaliTextStyle(14)}>
                {copy.donationItems}
              </Text>
            </View>
            <View className={sh.donationList}>
              {detail.daan.map((item, idx) => (
                <View key={`${item}-${idx}`} className={sh.donationChip}>
                  <Text className={sh.donationChipText} style={nepaliTextStyle(13)}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className={sh.noteBox}>
            <Text className={sh.noteText} style={nepaliTextStyle(14)}>
              <Text className={sh.noteLabel}>{copy.useLabel}</Text> {detail.remedy}
            </Text>
          </View>
        </View>
      </View>

      {/* full reference table */}
      <View>
        <Text className={sh.refTitle} style={nepaliTextStyle(16)}>
          {copy.referenceTitle}
        </Text>
        <TableScrollShell>
          <TableHeader>
            {panel.reference.columns.map((label, i) => (
              <TableHeaderCell key={label} width={SHANTI_COLUMN_WIDTHS[i]!} compact>
                <TableHeaderLabel compact>{label}</TableHeaderLabel>
              </TableHeaderCell>
            ))}
          </TableHeader>
          {panel.reference.rows.map((g, rowIndex) => (
            <TableRow key={g.key} rowIndex={rowIndex} highlight={g.active} onPress={() => panel.select(g.key)}>
              <Cell width={SHANTI_COLUMN_WIDTHS[0]} bold>
                <View className="flex-row items-center gap-1.5">
                  <GrahaPlanetIcon graha={g.key as GrahaKey} size={22} />
                  <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(12)}>
                    {g.name}
                  </Text>
                </View>
              </Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[1]}>{g.vaara}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[2]}>{g.beejMantra}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[3]}>{g.japa}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[4]}>{g.samidha}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[5]}>{g.gem}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[6]}>{g.metal}</Cell>
              <Cell width={SHANTI_COLUMN_WIDTHS[7]}>{g.daan}</Cell>
            </TableRow>
          ))}
        </TableScrollShell>
        <Text className={sh.refNote} style={nepaliTextStyle(14)}>
          {copy.disclaimer}
        </Text>
      </View>
    </View>
  );
}

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
