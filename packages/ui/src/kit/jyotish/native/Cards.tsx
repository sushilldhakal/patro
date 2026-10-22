import { ActivityIndicator } from "react-native";
import type { ShadbalaStatus, VimshopakaGrade } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useAshtakavargaCard, useBhavaBalaSelection, useBhavaBalaTable, useGrahaDetailsList, useShadbalaCard, useVimshopakaCard, useYogaReferenceCatalog } from "@vedic-patro/features/kundali";
import { Grid, Box, Icon, Input, Pressable, Table, Text } from "@vedic-patro/ui";
import type { AshtakavargaCardProps, BhavaBalaCardProps, GrahaDetailsListProps, ShadbalaCardProps, VimshopakaCardProps, YogaReferenceCatalogProps } from "../contract";
import { iconChevronDown, iconChevronRight, iconRotateCcw } from "../icons";
import { DashaSystemPanel } from "./DashaSystem";

export { DashaSystemPanel };

const v = kundaliDetailClasses.vimshopaka;
const GRADE: Record<VimshopakaGrade, string> = {
  full: cn(v.gradeFullBg, v.gradeFullText),
  mediocre: cn(v.gradeMediocreBg, v.gradeMediocreText),
  little: cn(v.gradeLittleBg, v.gradeLittleText),
  incapable: cn(v.gradeIncapableBg, v.gradeIncapableText),
};

const STATUS: Record<ShadbalaStatus, string> = {
  Exceptional: kundaliDetailClasses.parts.statusExceptional,
  Strong: kundaliDetailClasses.parts.statusStrong,
  Adequate: kundaliDetailClasses.parts.statusAdequate,
  Borderline: kundaliDetailClasses.parts.statusBorderline,
  Weak: kundaliDetailClasses.parts.statusWeak,
};

export function VimshopakaCard({ data, renderGraha }: VimshopakaCardProps) {
  const card = useVimshopakaCard(data);
  const columns = [
    { key: "graha", header: card.grahaHeader, width: 140 },
    ...card.columns.map((c) => ({ key: c.key, header: c.label, width: 88 })),
  ];
  return (
    <Box className={v.root}>
      <Box>
        <Text as="h3" className={v.title}>{card.title}</Text>
        <Text as="p" className={v.intro}>{card.intro}</Text>
      </Box>
      <Table
        columns={columns}
        rows={card.rows}
        rowKey={(row) => row.key}
        renderCell={(row, column) => {
          if (column.key === "graha") {
            return (
              <Box className="flex-row items-center gap-2" webClassName="inline-flex">
                {renderGraha({ graha: row.key, size: 22 })}
                <Text className="font-semibold text-foreground">{row.name}</Text>
              </Box>
            );
          }
          const cell = row.cells.find((item) => item.key === column.key);
          if (!cell || cell.score == null) return <Text className="text-center text-muted-foreground">—</Text>;
          return <Text className={cn(v.badge, v.badgeText, "inline-flex min-w-[3.25rem] font-num", GRADE[cell.grade])}>{cell.score}</Text>;
        }}
      />
      <Box className={cn(v.legend, v.legendText)}>
        {card.legend.map((g) => (
          <Text key={g.grade} as="span" className={cn(v.legendItem, "inline-flex")}>
            <Text as="span" className={cn(v.legendDot, GRADE[g.grade])}> </Text>
            {g.label}
            <Text as="span" className={v.legendRange}>{g.range}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}

const y = kundaliDetailClasses.yogaCatalog;

export function YogaReferenceCatalog({ excludeIds }: YogaReferenceCatalogProps) {
  const cat = useYogaReferenceCatalog({ excludeIds });
  const columns = cat.columns.map((c, i) => ({ key: c.key, header: c.label, width: [48, 120, 220, 200][i] ?? 120 }));
  return (
    <Box className={y.root}>
      <Pressable onPress={cat.toggle} className={cn(y.toggle, "w-full")}>
        <Box>
          <Text className={y.title}>{cat.title}</Text>
          <Text className={y.source}>{cat.source}</Text>
        </Box>
        <Icon node={cat.open ? iconChevronDown : iconChevronRight} size={16} tone="muted" />
      </Pressable>
      {cat.open ? (
        <Box className={y.body}>
          {cat.status === "error" ? <Text as="p" className={y.message}>{cat.errorText}</Text> : null}
          {cat.status === "loading" ? (
            <Box className={cn(y.loadingRow, "flex-row items-center gap-2")}>
              <ActivityIndicator size="small" />
              <Text className={y.loadingText}>{cat.loadingText}</Text>
            </Box>
          ) : null}
          {cat.status === "ready" ? (
            <>
              <Input type="search" value={cat.query} onChange={cat.setQuery} placeholder={cat.searchPlaceholder} label={cat.searchPlaceholder} className={y.searchInput} />
              <Table
                columns={columns}
                rows={cat.rows}
                rowKey={(row) => row.id}
                empty={<Text className={y.message}>{cat.noMatch}</Text>}
                renderCell={(row, column) => {
                  const value = column.key === "id" ? row.id : column.key === "name" ? row.name : column.key === "rule" ? row.definition : row.result;
                  return <Text className={column.key === "id" ? y.idText : column.key === "name" ? y.nameText : undefined}>{value}</Text>;
                }}
              />
              <Text as="p" className={y.note}>{cat.note}</Text>
            </>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

const g = kundaliDetailClasses.grahaList;

export function GrahaDetailsList(props: GrahaDetailsListProps) {
  const list = useGrahaDetailsList(props);
  if (list.rows.length === 0) return null;
  const widths = [140, 180, 64, 160, 150, 120, 100, 100, 88];
  const columns = list.columns.map((c, i) => ({ key: c.key, header: c.label, width: widths[i] ?? 96 }));
  return (
    <Table
      columns={columns}
      rows={list.rows}
      rowKey={(row) => row.key}
      renderCell={(row, column) => {
        if (column.key === "graha") {
          return (
            <Box className="flex-row items-center gap-1.5" webClassName="inline-flex">
              {row.isLagna ? null : props.renderGraha({ graha: row.key, size: 22 })}
              <Text className={g.name}>{row.name}</Text>
              {row.retrograde ? (
                <Text className={cn(g.retroBadge, g.retroText, "inline-flex")}>
                  <Icon node={iconRotateCcw} size={10} tone="secondary" /> {list.retroLabel}
                </Text>
              ) : null}
            </Box>
          );
        }
        if (column.key === "rashi_lon") return <Text className={g.dms}><Text className={g.dmsDeg}>{row.deg}</Text> <Text className={g.dmsRashi}>{row.rashiName}</Text> {row.min} {row.sec}</Text>;
        if (column.key === "bhava") return <Text className={g.bhava}>{row.bhava}</Text>;
        if (column.key === "nak") return <Text>{row.nakName} {row.pada}</Text>;
        if (column.key === "lord_sub") return <Text>{row.nakLord.name} / {row.subLord.name}</Text>;
        if (column.key === "owner") return <Text>{row.owner.name}{row.owner.bhava ? ` ${row.owner.bhava}` : ""}</Text>;
        if (column.key === "rel") return <Text>{row.relation}</Text>;
        if (column.key === "dignity") return <Text>{row.dignity}</Text>;
        return <Text>{row.rules}</Text>;
      }}
    />
  );
}

const av = kundaliDetailClasses.ashtakavarga;

export function AshtakavargaCard({ data, renderGraha, renderRashi }: AshtakavargaCardProps) {
  const card = useAshtakavargaCard(data);
  const targetCols = card.targets.map((tg) => ({ key: tg.key, header: tg.graha ? renderGraha({ graha: tg.key, size: 18 }) : tg.label, width: 72 }));
  return (
    <Box className={av.root}>
      <Box>
        <Text as="h3" className={av.heading}>{card.title}</Text>
        <Text as="p" className={av.intro}>{card.intro}</Text>
      </Box>
      {card.matrices.map((matrix) => {
        const columns = [{ key: "rashi", header: card.rashiHeader, width: 140 }, ...targetCols, { key: "sarv", header: card.sarvHeader, width: 64 }];
        const rows = [...matrix.rows.map((row) => ({ ...row, kind: "sign" as const })), { kind: "total" as const, rashi: 0, name: card.totalLabel, values: matrix.totals, sarvashtaka: matrix.sarvTotal, rashiNe: "" }];
        return (
          <Box key={matrix.key}>
            <Text as="h4" className={av.blockTitle}>{matrix.title}</Text>
            <Table
              columns={columns}
              rows={rows}
              rowKey={(row) => (row.kind === "total" ? "total" : String(row.rashi))}
              renderCell={(row, column) => {
                if (column.key === "rashi") {
                  return row.kind === "total" ? <Text className="font-semibold">{row.name}</Text> : (
                    <Box className="flex-row items-center gap-2" webClassName="inline-flex">
                      {renderRashi({ number: row.rashi, name: row.rashiNe, size: 22 })}
                      <Text className="font-semibold">{row.name}</Text>
                    </Box>
                  );
                }
                if (column.key === "sarv") return <Text className={cn(av.num, "font-semibold")}>{row.sarvashtaka}</Text>;
                const index = card.targets.findIndex((tg) => tg.key === column.key);
                return <Text className={av.num}>{row.values[index]}</Text>;
              }}
            />
          </Box>
        );
      })}
      <Box>
        <Text as="h4" className={av.blockTitle}>{card.shodhya.title}</Text>
        <Table
          columns={[{ key: "metric", header: " ", width: 140 }, ...targetCols]}
          rows={card.shodhya.rows}
          rowKey={(row) => row.key}
          renderCell={(row, column) => {
            if (column.key === "metric") return <Text className="font-semibold">{row.label}</Text>;
            const index = card.targets.findIndex((tg) => tg.key === column.key);
            return <Text className={av.num}>{row.values[index]}</Text>;
          }}
        />
      </Box>
    </Box>
  );
}

export function BhavaBalaCard({ data, vargaCharts, combustion, renderGraha, renderChart }: BhavaBalaCardProps) {
  const { selectedHouse, selectHouse } = useBhavaBalaSelection(data);
  const table = useBhavaBalaTable(data);
  const glance = kundaliDetailClasses.glance;
  const columns = table.columns.map((c, i) => ({ key: c.key, header: c.label, width: i === 0 ? 110 : 96 }));
  return (
    <Box className="gap-6">
      {renderChart({ data, selectedHouse, onSelectHouse: selectHouse, vargaCharts, combustion })}
      <Box className="gap-4">
        <Box>
          <Text as="h3" className={glance.heading}>{table.title}</Text>
          <Text as="p" className={glance.intro}>{table.intro}</Text>
        </Box>
        <Grid cols={2} gap={12}>
          {[table.strongest, table.weakest].map((s) => (
            <Box key={s.label} className={glance.card}>
              <Text as="p" className={glance.label}>{s.label}</Text>
              <Text as="p" className={glance.name}>{s.name}</Text>
              <Text as="p" className={glance.subTight}>{s.lordLabel} {s.lordName} · {s.percent}</Text>
            </Box>
          ))}
        </Grid>
        <Table
          columns={columns}
          rows={table.rows}
          rowKey={(row) => String(row.house)}
          classes={{ row: selectedHouse ? undefined : undefined }}
          renderCell={(row, column) => {
            const selected = selectedHouse === row.house ? "bg-primary/10" : undefined;
            if (column.key === "house") return <Pressable onPress={() => selectHouse(row.house)} className={selected}><Text className="font-semibold">{row.label}</Text></Pressable>;
            if (column.key === "lord") {
              return (
                <Box className="flex-row items-center justify-end gap-1.5" webClassName="inline-flex">
                  {renderGraha({ graha: row.lordKey, size: 20 })}
                  <Text>{row.lordName}</Text>
                </Box>
              );
            }
            const value = column.key === "bhavadhipati" ? row.bhavadhipati : column.key === "disha" ? row.disha : column.key === "drishti" ? row.drishti : column.key === "total_pinda" ? row.totalPinda : row.percent;
            return <Text className={cn("text-right font-mono tabular-nums", selected)}>{value}</Text>;
          }}
        />
      </Box>
    </Box>
  );
}

export function ShadbalaCard({ data, yuddha, bhavaBala, renderGraha, renderChart }: ShadbalaCardProps) {
  const card = useShadbalaCard({ data, yuddha, bhavaBala });
  const glance = kundaliDetailClasses.glance;
  const columns = [
    { key: "bala", header: card.balaHeader, width: 160 },
    ...card.planets.map((p) => ({
      key: p.key,
      width: 96,
      header: (
        <Pressable onPress={() => card.select(p.key)} className="flex-row items-center justify-end gap-1">
          {renderGraha({ graha: p.key, size: 20 })}
          <Text>{card.grahaName(p.key)}</Text>
        </Pressable>
      ),
    })),
  ];
  return (
    <Box className="gap-6">
      <Box>
        <Text as="h3" className={glance.heading}>{card.title}</Text>
        <Text as="p" className={glance.introSpaced}>{card.method}</Text>
        <Grid cols={{ base: 2, lg: 4 }} gap={12}>
          {[card.strongest, card.weakest].map((item) => (
            <Box key={item.label} className={glance.card}>
              <Text as="p" className={glance.label}>{item.label}</Text>
              <Box className="flex-row items-center gap-1">{renderGraha({ graha: item.key, size: 28 })}<Text as="p" className={glance.name}>{item.name}</Text></Box>
              <Text className={cn(kundaliDetailClasses.parts.statusBadge, STATUS[item.status])}>{card.statusLabel(item.status)}</Text>
              <Text className={glance.sub}>{item.sub}</Text>
            </Box>
          ))}
          <Box className={glance.card}>
            <Text as="p" className={glance.label}>{card.average.label}</Text>
            <Text as="p" className={glance.big}>{card.average.rupas}</Text>
            <Text as="p" className={glance.subTight}>{card.average.virupas}</Text>
          </Box>
          <Box className={glance.card}>
            <Text as="p" className={glance.label}>{card.threshold.label}</Text>
            <Text as="p" className={glance.big}>{card.threshold.count}<Text className={glance.bigOf}>{card.threshold.of}</Text></Text>
            <Text as="p" className={glance.subTight}>{card.threshold.sub}</Text>
            <Box className={glance.chips}>
              {card.threshold.chips.map((c) => (
                <Text key={c.status} className={cn(glance.chip, glance.chipText, c.active ? STATUS[c.status] : "border-border")}>{c.label}</Text>
              ))}
            </Box>
          </Box>
        </Grid>
      </Box>
      {renderChart({ planets: card.planets, selectedKey: card.selectedKey, onSelect: card.select, yuddha, scale: card.scale, onScaleChange: card.setScale })}
      <Box>
        <Text as="h4" className={glance.tableTitle}>{card.tableTitle}</Text>
        <Table
          columns={columns}
          rows={card.rows}
          rowKey={(row) => row.key}
          renderCell={(row, column) => {
            if (column.key === "bala") {
              return row.expandable ? (
                <Pressable onPress={row.toggle} className="flex-row items-center gap-1">
                  <Icon node={row.open ? iconChevronDown : iconChevronRight} size={14} tone="muted" />
                  <Text>{row.label}</Text>
                </Pressable>
              ) : <Text className={row.sub ? undefined : "font-semibold"}>{row.label}</Text>;
            }
            const index = card.planets.findIndex((p) => p.key === column.key);
            const value = row.values[index] ?? "";
            if (row.statuses) return <Text className={cn(kundaliDetailClasses.parts.statusBadge, STATUS[row.statuses[index]!])}>{value}</Text>;
            return <Text className={cn("text-right font-mono tabular-nums", row.bold && "font-semibold", card.selectedKey === column.key && "bg-primary/10")}>{value}</Text>;
          }}
        />
        <Text as="p" className={glance.tableNote}>{card.note}</Text>
        {card.yuddhaLine ? <Text as="p" className={glance.warn}>{card.yuddhaLine}</Text> : null}
      </Box>
    </Box>
  );
}
