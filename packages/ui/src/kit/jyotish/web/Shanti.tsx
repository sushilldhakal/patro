import { useRef } from "react";
import { Trans } from "@vedic-patro/i18n/react";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useShantiVidhiPanel } from "@vedic-patro/features/shanti";
import { Box, Icon, Pressable, Table, Text } from "@vedic-patro/ui";
import type { ShantiVidhiPanelProps } from "../contract";
import { iconBookOpen, iconCalendarClock, iconChevronDown, iconChevronUp, iconClock, iconCoins, iconCompass, iconFlame, iconSparkles, iconStar, iconUserRound } from "../icons";

const sh = kundaliDetailClasses.shanti;
const TILE = { samidha: iconFlame, gem: iconStar, metal: iconSparkles, deity: iconFlame, pratyadhidevata: iconUserRound, disha: iconCompass, pooja: iconSparkles } as const;
const REMEDY = {
  shanti: cn(sh.remedyShanti, sh.remedyShantiText),
  strengthen: cn(sh.remedyStrengthen, sh.remedyStrengthenText),
  pacify: cn(sh.remedyPacify, sh.remedyPacifyText),
  pacify_transit: cn(sh.remedyPacify, sh.remedyPacifyText),
  soothe: cn(sh.remedySoothe, sh.remedySootheText),
} as const;

export function ShantiVidhiPanel({ grahaShanti, isError = false, renderGraha }: ShantiVidhiPanelProps) {
  const detailRef = useRef<HTMLDivElement>(null);
  const panel = useShantiVidhiPanel({
    grahaShanti,
    isError,
    scrollToDetail: () => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });
  const { detail, copy } = panel;
  const columns = panel.reference.columns.map((label, i) => ({ key: String(i), header: label, width: i === 0 ? 140 : 110 }));
  return (
    <Box className={sh.root}>
      {panel.status === "error" ? <Text className={cn(sh.errorBox, sh.errorText)}>{copy.loadError}</Text> : null}
      {panel.status === "findings" ? panel.groups.map((group) => (
        <Box key={group.tier}>
          <button type="button" onClick={group.toggle} className={cn(sh.groupToggle, sh.groupToggleText, "flex w-full")}>
            <Text>{group.title}</Text>
            <Icon node={group.open ? iconChevronUp : iconChevronDown} size={16} tone="muted" />
          </button>
          {group.open ? (
            <Box className="grid gap-3 sm:grid-cols-2">
              {group.cards.map((card) => (
                <Box key={card.key} className={sh.finding}>
                  <Text className={sh.findingStep}>{card.step}</Text>
                  <Text className={cn(sh.remedyBadge, sh.remedyBadgeText, REMEDY[card.remedy])}>{card.remedyLabel}</Text>
                  {renderGraha({ graha: card.graha, size: 28 })}
                  <Text className={sh.findingName}>{card.name}</Text>
                  <Text className={sh.findingReason}>{card.reason}</Text>
                  <Pressable onPress={() => panel.selectFinding(card.graha)} className={sh.findingButton}><Text>{card.viewLabel}</Text></Pressable>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      )) : null}
      {panel.status !== "error" && panel.status !== "findings" ? <Text className={cn(sh.emptyBox, sh.emptyText)}>{copy.empty}</Text> : null}
      <Text className={sh.basisNote}>{copy.basisNote}</Text>
      <Box className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {panel.selector.map((g) => (
          <Pressable key={g.key} onPress={() => panel.select(g.key)} className={cn(sh.selector, g.active ? cn(sh.selectorActive, sh.selectorTextActive) : cn(sh.selectorIdle, sh.selectorTextIdle))}>
            {renderGraha({ graha: g.key, size: 28 })}
            <Text className={sh.selectorText}>{g.name}</Text>
          </Pressable>
        ))}
      </Box>
      <div ref={detailRef} className={cn(sh.detail, "scroll-mt-20")}>
        <Box className={sh.detailHead} webClassName="flex">
          {renderGraha({ graha: detail.key, size: 40 })}
          <Box>
            <Text as="h2" className={sh.detailTitle}>{detail.title}</Text>
            <Text className={sh.detailSubtitle}>{detail.subtitle}</Text>
          </Box>
          <Text className={sh.pill}><Icon node={iconCalendarClock} size={14} tone="secondary" /> {detail.vaara}</Text>
          <Text className={sh.pill}><Icon node={iconClock} size={14} tone="secondary" /> {detail.samaya}</Text>
          <Text className={sh.pill}>{detail.color}</Text>
        </Box>
        <Box className={sh.mantraBox}>
          <Text className={sh.mantraLabel}>{copy.beejaHeading}</Text>
          <Text className={sh.mantraBig}>{detail.beejMantra}</Text>
          <Text className={sh.japa}><Trans i18nKey={detail.japaLine.i18nKey} values={detail.japaLine.values} components={{ v: <Text className={sh.japaValue} /> }} /></Text>
          <Text className={sh.mantraLabel}>{copy.vedicHeading}</Text>
          <Text className={sh.vedic}>{detail.vedicMantra}</Text>
          <Text className={sh.mantraLabel}>{copy.tantrikHeading}</Text>
          <Text className={sh.mantraBig}>{detail.tantrikMantra}</Text>
        </Box>
        <Box className={sh.stotramBox}>
          <Text className={sh.tileLabel}><Icon node={iconBookOpen} size={16} tone="secondary" /> {copy.stotramHeading}</Text>
          <Text className={sh.stotram}>{detail.stotram}</Text>
        </Box>
        <Text className={sh.yantraLabel}>{copy.yantraHeading}</Text>
        <Box className="grid w-32 grid-cols-3 gap-1">
          {detail.yantra.map((n, i) => <Text key={i} className={cn(sh.yantraCell, sh.yantraText)}>{n}</Text>)}
        </Box>
        <Box className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.tiles.map((tile) => (
            <Box key={tile.key} className={sh.tile} webClassName="flex">
              <Icon node={TILE[tile.key]} size={16} tone="secondary" />
              <Text className={sh.tileLabel}>{tile.label}</Text>
              <Text className={sh.tileValue}>{tile.value}</Text>
            </Box>
          ))}
        </Box>
        <Text className={cn(sh.noteBox, sh.noteText)}><Text className={sh.noteLabel}>{copy.gemDetailLabel}</Text> {detail.gemDetail}</Text>
        <Text className={sh.donationTitle}><Icon node={iconCoins} size={16} tone="secondary" /> {copy.donationItems}</Text>
        <Box className={sh.donationList}>
          {detail.daan.map((item, idx) => <Text key={`${item}-${idx}`} className={cn(sh.donationChip, sh.donationChipText)}>{item}</Text>)}
        </Box>
        <Text className={cn(sh.noteBox, sh.noteText)}><Text className={sh.noteLabel}>{copy.useLabel}</Text> {detail.remedy}</Text>
      </div>
      <Text as="h3" className={sh.refTitle}>{copy.referenceTitle}</Text>
      <Table
        columns={columns}
        rows={panel.reference.rows}
        rowKey={(row) => row.key}
        renderCell={(row, column) => {
          const values = [row.name, row.vaara, row.beejMantra, row.japa, row.samidha, row.gem, row.metal, row.daan];
          if (column.key === "0") return <Pressable onPress={() => panel.select(row.key)}>{renderGraha({ graha: row.key, size: 22 })}<Text>{row.name}</Text></Pressable>;
          return <Text>{values[Number(column.key)]}</Text>;
        }}
      />
      <Text className={sh.refNote}>{copy.disclaimer}</Text>
    </Box>
  );
}
