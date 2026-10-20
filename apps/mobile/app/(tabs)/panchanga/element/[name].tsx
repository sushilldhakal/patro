import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { useElementPage, type ElementPage, type SpanBoundaryView, type SpanCard, type ToneRowView } from "@vedic-patro/features/panchanga-element";
import { AppShell } from "@/components/AppShell";
import { AllElementsLink, ElementDescription, GrahaBanner } from "@vedic-patro/ui/kit/panchanga";
import { PatroMonthYearNavBlock } from "@/components/patro-date/PatroMonthYearNavBlock";
import {
  ElementDayRowIcon,
  ElementSpanIcon,
  NakshatraGlyphIcon,
  RashiGlyphIcon,
} from "@/components/panchanga/element/ElementGlyphIcon";
import { NavataraBalamCardGrid } from "@vedic-patro/ui/kit/panchanga";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { Card } from "@/components/ui/Card";
import { Grid } from "@vedic-patro/ui";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/domain/utils";
import { civilIsoFromDate } from "@vedic-patro/domain/patro-day";
import { useThemeColors } from "@/lib/theme-context";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";

/*
 * Column counts match the web grid at each breakpoint. `Grid` measures the
 * column it sits in, so tiles keep exact widths beside the iPad sidebar rail
 * (percent widths plus gaps wrapped the last tile onto its own row there).
 */
const SPAN_COLS = { base: 1, sm: 2, lg: 4 } as const;
const ROW_COLS = { base: 1, sm: 2, lg: 3 } as const;
const BALA_COLS = { base: 1, sm: 2, lg: 4 } as const;
const LEGEND_COLS = { base: 1, sm: 2 } as const;

/* ── span (begin→end) view ─────────────────────────────────────────────── */

function SpanBoundary({ view, tone }: { view: SpanBoundaryView; tone: "begin" | "end" }) {
  const colors = useThemeColors();
  const accent = tone === "begin" ? colors.success : colors.danger;
  return (
    <View className={cn("gap-0.5 rounded-md px-2 py-1.5", tone === "begin" ? "bg-success/10" : "bg-danger/10")}>
      {/* The time is already in `when`; repeating it in the corner showed it twice. */}
      <Text style={{ color: accent, ...nepaliTextStyle(11) }} className="text-xs font-semibold">
        {view.label}
      </Text>
      <Text className="m-0 font-num text-sm font-semibold leading-snug text-foreground md:text-base" style={nepaliTextStyle(14)}>
        {view.when}
      </Text>
    </View>
  );
}

function SpanList({ spans, elementId }: { spans: SpanCard[]; elementId: string }) {
  return (
    <Grid cols={SPAN_COLS} gap={10}>
      {spans.map((s) => (
        <Card key={s.key} className="gap-2 p-3">
          <View className="flex-row items-center gap-2.5">
            <ElementSpanIcon elementId={elementId} span={s.span} size={34} />
            <View className="min-w-0 flex-1">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
                  {s.name}
                </Text>
                {s.paksha ? (
                  <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
                    {s.paksha}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          <View className="gap-1.5">
            <SpanBoundary view={s.begins} tone="begin" />
            <SpanBoundary view={s.ends} tone="end" />
          </View>
        </Card>
      ))}
    </Grid>
  );
}

/* ── table (per-day) view ──────────────────────────────────────────────── */

function ToneRow({ row, elementId }: { row: ToneRowView; elementId: string }) {
  const colors = useThemeColors();
  const tone = row.bad
    ? { bg: undefined, cls: "bg-danger/10", fg: colors.danger }
    : row.good
      ? { bg: undefined, cls: "bg-success/12", fg: colors.success }
      : elementId === "choghadiya"
        ? /* Chara is neutral, not missing: amber like its legend dot, not grey. */
          { bg: undefined, cls: "bg-warning/12", fg: colors.foreground }
        : { bg: colors.surfaceInset, cls: "", fg: colors.foreground };
  const leading: ReactNode = row.glyph ? (
    row.glyph.kind === "nakshatra" ? (
      <NakshatraGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    ) : (
      <RashiGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    )
  ) : elementId === "choghadiya" ? null : (
    <ElementDayRowIcon elementId={elementId} row={row.raw} size={24} />
  );

  return (
    <View
      style={{ backgroundColor: tone.bg }}
      className={cn("flex-row items-center justify-between gap-2 rounded-lg px-3 py-2", tone.cls)}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {leading}
        <Text numberOfLines={2} style={{ color: tone.fg, ...nepaliTextStyle(14) }} className="text-sm shrink font-semibold">
          {row.label}
        </Text>
        {row.badge ? (
          <View className="rounded-full bg-secondary/20 px-1.5 py-px">
            <Text style={{ color: colors.secondary, ...nepaliTextStyle(12) }} className="text-sm font-bold">
              {row.badge}
            </Text>
          </View>
        ) : null}
      </View>
      {row.trailing ? (
        <Text style={{ color: tone.fg, ...nepaliTextStyle(14) }} className="text-sm shrink-0 font-num opacity-90">
          {row.trailing}
        </Text>
      ) : null}
    </View>
  );
}

function TableView({ table, elementId }: { table: NonNullable<ElementPage["table"]>; elementId: string }) {
  if (table.kind === "message") {
    return (
      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
        {table.text}
      </Text>
    );
  }
  const rows = (cols: typeof ROW_COLS | typeof BALA_COLS) => (
    <Grid cols={cols} gap={6}>
      {table.rows.map((row) => (
        <ToneRow key={row.key} row={row} elementId={elementId} />
      ))}
    </Grid>
  );
  if (table.kind === "strength") {
    return (
      <View className="gap-2">
        {table.anchor ? (
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {table.anchor.label}: <Text className="font-bold text-foreground">{table.anchor.value}</Text>
          </Text>
        ) : null}
        {rows(BALA_COLS)}
      </View>
    );
  }
  if (table.kind === "choghadiya") {
    return (
      <>
        <Grid cols={LEGEND_COLS} gapX={16} gapY={4} className="mb-3">
          {table.legend.map((item) => (
            <View key={item.key} className="flex-row items-center gap-2">
              <View
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  item.tone === "good" ? "bg-success" : item.tone === "bad" ? "bg-destructive" : "bg-warning",
                )}
              />
              <Text style={nepaliTextStyle(14)} className="flex-1 text-sm text-muted-foreground">
                {item.label}
              </Text>
            </View>
          ))}
        </Grid>
        {rows(ROW_COLS)}
      </>
    );
  }
  if (elementId === "hora") {
    return (
      <>
        <HoraLegend />
        {rows(ROW_COLS)}
      </>
    );
  }
  return rows(ROW_COLS);
}

/** Hora rows are tinted green / red; say what the colours mean. */
function HoraLegend() {
  const { t } = useLocale();
  const items = [
    { key: "good", dot: "bg-success", label: t("choghadiya.quality_good") },
    { key: "bad", dot: "bg-destructive", label: t("choghadiya.quality_bad") },
  ];
  return (
    <View className="mb-3 flex-row gap-4">
      {items.map((item) => (
        <View key={item.key} className="flex-row items-center gap-2">
          <View className={cn("h-2.5 w-2.5 rounded-full", item.dot)} />
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BalamView({ balam, clock }: { balam: NonNullable<ElementPage["balam"]>; clock?: string }) {
  const { lang } = useLocale();
  if (balam.empty) {
    return (
      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
        {balam.empty}
      </Text>
    );
  }
  return (
    <View className="gap-2">
      {balam.moonRef ? (
        <Text className="text-sm text-center text-muted-foreground" style={nepaliTextStyle(13)}>
          {balam.moonRef}
        </Text>
      ) : null}
      <NavataraBalamCardGrid cards={balam.cards} clock={clock} formatName={balam.cardName} lang={lang} variant={balam.variant} />
    </View>
  );
}

/* ── screen ────────────────────────────────────────────────────────────── */

export default function ElementScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ElementScreenView name={name} />;
}

/**
 * A panchanga element — the app's drawing of `useElementPage` (@vedic-patro/features).
 * Shared by `/panchanga/element/[name]` and the static `/panchanga/<table>` routes.
 */
export function ElementScreenView({ name }: { name: string | undefined }) {
  const { lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear, month, setMonth, stepMonth, goToday } = usePatroMonthBrowse();
  const todayAd = todayAdStringInTimezone(new Date(), resolveTimeZone(undefined, location.params.timezone));
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const dateAd = civilIsoFromDate(date);

  const page = useElementPage({ name, location, month: { era, year, month }, day: { dateAd } });
  const { meta, copy } = page;

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle(era, year, month, lang, digits),
    [era, year, month, lang, digits],
  );

  if (page.redirectTo) {
    return <Redirect href={`/panchanga/element/${page.redirectTo}`} />;
  }

  if (!meta) {
    return (
      <AppShell title={copy.unknown}>
        <Pressable onPress={() => router.push("/panchanga/details" as never)}>
          <Text style={{ color: colors.primary }} className="text-sm underline">
            {copy.backToDetails}
          </Text>
        </Pressable>
      </AppShell>
    );
  }

  const body = () => {
    if (page.status === "loading") return <LoadingState />;
    if (page.status === "error") return <ErrorState />;
    if (page.kind === "span") return <SpanList spans={page.spans} elementId={meta.id} />;
    return (
      <Card className="p-3.5">
        {page.kind === "balam" && page.balam ? (
          <BalamView balam={page.balam} clock={page.clock} />
        ) : page.table ? (
          <TableView table={page.table} elementId={meta.id} />
        ) : null}
      </Card>
    );
  };

  return (
    <AppShell title={copy.title} showHeader={false}>
      <GrahaBanner icon="sparkles-outline" title={copy.title} blurb={copy.blurb} />

      {page.kind === "span" ? (
        <PatroMonthYearNavBlock
          era={era}
          onEraChange={setEra}
          year={year}
          month={month}
          onMonthChange={setMonth}
          onYearChange={setYear}
          location={location}
          onLocationChange={setLocation}
          crossEraSubtitle={crossEraSubtitle}
          onToday={() => goToday(todayAd)}
          onPrev={() => stepMonth(-1)}
          onNext={() => stepMonth(1)}
        />
      ) : (
        <PanchangaDateNav
          className="mb-4"
          date={date}
          onDateChange={setDate}
          todayAd={todayAd}
          adDateStr={dateAd}
          location={location}
          onLocationChange={setLocation}
          wheelData={page.kind === "balam" ? page.panchanga : undefined}
        />
      )}

      {body()}

      <ElementDescription elementId={meta.id} />

      <AllElementsLink onPress={() => router.push("/panchanga/details" as never)} />
    </AppShell>
  );
}
