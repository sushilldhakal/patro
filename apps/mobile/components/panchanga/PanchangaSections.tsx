import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { PanchangaDay } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import {
  formatAayanLabel,
  formatDurationFull,
  formatMadhyahnaDisplay,
  formatNepalSambatDisplay,
  formatPakshaLabel,
  formatPakshaNepaliDisplay,
  formatShakaYear,
  formatTimeShort,
  formatGhatiEnd,
  getDinVisheshLabels,
  getMuhurtaRows,
  getMoonriseDisplay,
  getMoonsetDisplay,
  getAayanPauranik,
  getAayanVedic,
  getRituPauranik,
  getRituVedic,
  formatRituLabel,
  getPanchangaDetail,
  getLagnaDisplay,
  getPlanetRows,
  getPlanetsAnchorLabel,
  formatSolarCorrectionDisplay,
  getSolarCorrections,
  getSunriseDisplay,
  getSunsetDisplay,
  getVaaraNe,
  formatRashiDisplay,
  formatSpanEndTime,
  getChandrabalamTable,
  getNakshatraPadaSpans,
  getPanchakaRahita,
  getTarabalaTable,
  getUdayaLagna,
  getVaaraEn,
  formatShortClock,
  formatTimeRangeShort,
  getNivasShool,
  toNepaliDigits,
} from "@/lib/panchanga-format.web";
import type { NivasShoolSegment, UdayaLagnaRow } from "@/lib/api";
import { resolveSamvatsaraForBsYear } from "@/lib/samvatsara";
import {
  findCurrentUdayaLagna,
  getChandraBalamCards,
  getTaraBalamCards,
  type BalamCardItem,
} from "@/lib/balam-cards";
import {
  PanchangaFieldCell,
  PanchangaGroupLabel,
  PanchangaLagnaCard,
  PanchangaSection,
  PanchangaTableBody,
  PanchangaTimingCard,
  TimingRange,
  UptoValue,
  panchangaCardGrid,
} from "./PanchangaLayout";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { NavataraBalamCardGrid } from "./NavataraBalamCardGrid";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { tithiIndexFromPanchanga } from "@/lib/tithi-wheel-data";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

type AngaEnd = {
  name_ne?: string;
  name?: string;
  end_local_time?: string;
  end_ghati_clock?: string;
  end_hours_clock?: string;
};

type Anga = AngaEnd & {
  next?: AngaEnd;
};

function angaEndTime(anga?: AngaEnd | null): string | undefined {
  if (!anga) return undefined;
  const t =
    formatTimeShort(anga.end_local_time) ??
    formatTimeShort(anga.end_hours_clock) ??
    formatGhatiEnd(anga.end_ghati_clock);
  return t ? toNepaliDigits(t) : undefined;
}

function AngaCell({ anga }: { anga?: Anga | null }) {
  const { pick } = useLocale();
  if (!anga) return <Text>—</Text>;
  const name = pick(anga.name_ne ?? anga.name ?? "—", anga.name ?? anga.name_ne ?? "—");
  const next = anga.next;
  const nextName = next?.name_ne ?? next?.name;
  return (
    <>
      <UptoValue name={name} endTime={angaEndTime(anga)} />
      {nextName ? (
        // The next anga now carries its own end time — on a kshaya-tithi day
        // this is where the skipped tithi's ending shows (e.g. प्रतिपदा … सम्म).
        <UptoValue
          name={pick(nextName, next?.name ?? next?.name_ne ?? nextName)}
          endTime={angaEndTime(next)}
        />
      ) : null}
    </>
  );
}

export function SunMoonSamvatSection({ p }: { p: PanchangaDay }) {
  const { pick, lang, digits } = useLocale();
  const solar = getSolarCorrections(p);
  const belaantar = formatSolarCorrectionDisplay(solar?.belaantar);
  const deshaantar = formatSolarCorrectionDisplay(solar?.deshaantar);
  const detail = getPanchangaDetail(p);
  const bs = (detail?.bs_date ?? p.bs_date) as
    | { year?: number; month_name_ne?: string; month_name?: string; day?: number }
    | undefined;
  const ns = formatNepalSambatDisplay(p);
  const shaka = formatShakaYear(p);
  const samvatsara = bs?.year
    ? resolveSamvatsaraForBsYear(bs.year, p.samvatsara as Parameters<typeof resolveSamvatsaraForBsYear>[1])
    : undefined;
  const pakshaLabel = formatPakshaLabel(p, lang) ?? "—";
  const tithiIdx = tithiIndexFromPanchanga(p);

  return (
    <PanchangaSection titleKey="sections.sun_moon_samvat">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.sunrise" nowrap>
          <Text>🌅</Text>
          <Text className="font-mono font-semibold">{getSunriseDisplay(p) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.sunset" nowrap>
          <Text>🌇</Text>
          <Text className="font-mono font-semibold">{getSunsetDisplay(p) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonrise" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className="font-mono font-semibold">{getMoonriseDisplay(p, lang) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonset" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className="font-mono font-semibold">{getMoonsetDisplay(p, lang) ?? "—"}</Text>
        </PanchangaFieldCell>
        {belaantar ? (
          <PanchangaFieldCell labelKey="sections.equation_of_time" nowrap>
            <Text className="font-mono font-semibold">{belaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        {deshaantar ? (
          <PanchangaFieldCell labelKey="sections.longitude_correction" nowrap>
            <Text className="font-mono font-semibold">{deshaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <Text className="font-semibold">{pakshaLabel}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.vikram" nowrap>
          <Text className="font-semibold">
            {bs?.year && bs.day && (bs.month_name_ne || bs.month_name)
              ? `${digits(bs.year)} ${pick(bs.month_name_ne ?? bs.month_name ?? "", bs.month_name ?? bs.month_name_ne ?? "")} ${digits(bs.day)}`
              : (p.display?.bs_ne ?? "—")}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.samvatsara" nowrap>
          <Text className="font-semibold">
            {samvatsara ? pick(samvatsara.name_ne, samvatsara.name_en) : "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shaka" nowrap>
          <Text className="font-semibold">{shaka ? digits(shaka) : "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.nepal_sambat" nowrap>
          <Text className="font-semibold">{ns ?? "—"}</Text>
        </PanchangaFieldCell>
      </PanchangaTableBody>
      {solar?.ishtakaal_note_ne ? (
        <Text className="text-body m-0 border-t border-border px-4 py-2 text-muted-foreground">
          {solar.ishtakaal_note_ne}
        </Text>
      ) : null}
    </PanchangaSection>
  );
}

/** @deprecated use SunMoonSamvatSection */
export function SunMoonSection({ p }: { p: PanchangaDay }) {
  return <SunMoonSamvatSection p={p} />;
}

/** @deprecated use SunMoonSamvatSection */
export function SamvatSection(_props: { p: PanchangaDay }) {
  return null;
}

export function PanchangCoreSection({ p }: { p: PanchangaDay }) {
  const { pick, lang } = useLocale();
  const detail = getPanchangaDetail(p);
  const instant = p.mode === "ephemeris";
  const tithi = (instant ? p.tithi : detail?.tithi ?? p.tithi) as Anga | undefined;
  const nakshatra = (instant ? p.nakshatra : detail?.nakshatra ?? p.nakshatra) as Anga | undefined;
  const yoga = (instant ? p.yoga : detail?.yoga ?? p.yoga) as Anga | undefined;
  const karana = (instant ? p.karana : detail?.karana ?? p.karana) as Anga | undefined;
  const paksha = formatPakshaLabel(p, lang) ?? formatPakshaNepaliDisplay(p);
  const tithiIdx = tithiIndexFromPanchanga(p);

  return (
    <PanchangaSection titleKey="sections.panchang_core">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="tithi">
          <AngaCell anga={tithi} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="nakshatra">
          <AngaCell anga={nakshatra} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.yoga">
          <AngaCell anga={yoga} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.karana">
          <AngaCell anga={karana} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.weekday" nowrap>
          <Text className="font-semibold">
            {pick(getVaaraNe(p, p.weekday) ?? "—", getVaaraEn(p, p.weekday) ?? "—")}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className="font-semibold">{paksha ?? "—"}</Text>
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function RashiSection({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { pick, digits } = useLocale();
  const padaSpans = getNakshatraPadaSpans(p);

  if (!padaSpans?.length) return null;

  return (
    <PanchangaSection titleKey="sections.pada_detail">
      <PanchangaTableBody>
        {padaSpans.map((span, i) => {
          const nakName = pick(
            span.nakshatra_name_ne ?? span.nakshatra_name ?? "",
            span.nakshatra_name ?? span.nakshatra_name_ne ?? "",
          );
          const padaLabel = pick(
            span.pada_ne ?? digits(span.pada ?? ""),
            String(span.pada ?? span.pada_ne ?? ""),
          );
          const endTime = formatSpanEndTime(span);
          return (
            <PanchangaFieldCell
              key={`pada-${i}`}
              label={nakName ? `${nakName} — ${padaLabel} ${t("sections.pada_unit")}` : "—"}
              nowrap
            >
              <Text className="font-mono font-semibold">
                {endTime ? `${endTime} ${t("sections.until")}` : "—"}
              </Text>
            </PanchangaFieldCell>
          );
        })}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function BalamCardGrid({
  cards,
  clock,
  formatName,
  lang,
  variant,
}: {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant: "chandrabala" | "tarabala";
}) {
  return (
    <NavataraBalamCardGrid
      cards={cards}
      clock={clock}
      formatName={formatName}
      lang={lang}
      variant={variant}
    />
  );
}

function BalamKindBlock({
  label,
  moonRef,
  cards,
  clock,
  formatName,
  lang,
  variant,
}: {
  label: string;
  moonRef?: string;
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant: "chandrabala" | "tarabala";
}) {
  if (!cards.length) return null;

  return (
    <View className="flex flex-col gap-2 border-b border-border/80 px-4 py-3 last:border-b-0">
      <PanchangaGroupLabel className="px-0 pt-0">{label}</PanchangaGroupLabel>
      {moonRef ? (
        <Text className="text-body m-0 text-center text-muted-foreground">{moonRef}</Text>
      ) : null}
      <BalamCardGrid
        cards={cards}
        clock={clock}
        formatName={formatName}
        lang={lang}
        variant={variant}
      />
    </View>
  );
}

export function BalamSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const { t } = useTranslation();
  const { pick, lang } = useLocale();
  const chandraCards = getChandraBalamCards(p);
  const taraCards = getTaraBalamCards(p);
  const chandraTable = getChandrabalamTable(p);
  const taraTable = getTarabalaTable(p);

  if (!chandraCards.length && !taraCards.length) {
    return null;
  }

  const chandraMoonRef = chandraTable?.moon_label
    ? pick(
        `सूर्योदयको चन्द्र राशि: ${chandraTable.moon_label}`,
        `Moon sign at sunrise: ${chandraTable.moon_label_en ?? chandraTable.moon_label}`,
      )
    : undefined;
  const taraMoonRef = taraTable?.moon_label
    ? pick(
        `सूर्योदयको चन्द्र नक्षत्र: ${taraTable.moon_label}`,
        `Moon nakshatra at sunrise: ${taraTable.moon_label_en ?? taraTable.moon_label}`,
      )
    : undefined;

  const formatRashiName = (card: BalamCardItem) =>
    formatRashiDisplay(card.name, card.nameEn, lang) ?? pick(card.name, card.nameEn ?? card.name);
  const formatNakName = (card: BalamCardItem) => pick(card.name, card.nameEn ?? card.name);

  return (
    <PanchangaSection titleKey="sections.balam">
      <BalamKindBlock
        label={t("muhurta_aside.chandrabal")}
        moonRef={chandraMoonRef}
        cards={chandraCards}
        clock={clock}
        formatName={formatRashiName}
        lang={lang}
        variant="chandrabala"
      />
      <BalamKindBlock
        label={t("muhurta_aside.tarabal")}
        moonRef={taraMoonRef}
        cards={taraCards}
        clock={clock}
        formatName={formatNakName}
        lang={lang}
        variant="tarabala"
      />
    </PanchangaSection>
  );
}

export function PanchakaLagnaSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const { t } = useTranslation();
  const { pick, lang } = useLocale();
  const panchaka = getPanchakaRahita(p) ?? [];
  const lagna = getUdayaLagna(p) ?? [];
  const currentLagna = findCurrentUdayaLagna(lagna, clock);

  if (!panchaka.length && !lagna.length) return null;

  return (
    <PanchangaSection titleKey="sections.panchaka_lagna">
      <PanchangaTableBody>
        {panchaka.length > 0 ? (
          <>
            <PanchangaGroupLabel>{t("sections.today_panchaka")}</PanchangaGroupLabel>
            {panchaka.map((pr, i) => (
              <PanchangaTimingCard
                key={`panchaka-${i}`}
                label={pick(pr.name_ne ?? pr.name ?? "—", pr.name ?? pr.name_ne ?? "—")}
                time={
                  formatTimeRangeShort(
                    pr.start_local_time_short ?? pr.start_local_time,
                    pr.end_local_time_short ?? pr.end_local_time,
                  ) ?? undefined
                }
                highlight={pr.good}
              />
            ))}
          </>
        ) : null}
        {lagna.length > 0 ? (
          <>
            <PanchangaGroupLabel className={panchaka.length > 0 ? "pt-3" : undefined}>
              {t("sections.today_udaya_lagna")}
            </PanchangaGroupLabel>
            <View className={panchangaCardGrid}>
              {lagna.map((lg, i) => (
                <UdayaLagnaCard
                  key={`lagna-${lg.number ?? i}-${lg.start_local_time_short ?? i}`}
                  row={lg}
                  lang={lang}
                  pushkaraLabel={t("sections.pushkara")}
                  isCurrent={
                    currentLagna != null &&
                    currentLagna.number === lg.number &&
                    (currentLagna.start_local_time_short ?? currentLagna.start_local_time) ===
                      (lg.start_local_time_short ?? lg.start_local_time)
                  }
                />
              ))}
            </View>
          </>
        ) : null}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function UdayaLagnaCard({
  row,
  lang,
  pushkaraLabel,
  isCurrent,
}: {
  row: UdayaLagnaRow;
  lang?: string;
  pushkaraLabel: string;
  isCurrent?: boolean;
}) {
  const rashi = formatRashiDisplay(row.name_ne, row.name, lang) ?? "—";
  const timeRange =
    formatTimeRangeShort(
      row.start_local_time_short ?? row.start_local_time,
      row.end_local_time_short ?? row.end_local_time,
    ) ?? undefined;
  const pushkaraTimes =
    row.pushkara_navamsha
      ?.map((h) => formatShortClock(h.local_time_short ?? h.local_time))
      .filter(Boolean)
      .join(", ") ?? "";

  const titleLine = (
    <Text>
      {rashi}
      {timeRange ? (
        <Text className="font-mono font-semibold tabular-nums"> {timeRange}</Text>
      ) : null}
    </Text>
  );

  const footerLine =
    pushkaraTimes.length > 0 ? (
      <Text>
        {pushkaraLabel}{" "}
        <Text className="font-mono tabular-nums text-foreground">{pushkaraTimes}</Text>
      </Text>
    ) : undefined;

  return (
    <PanchangaLagnaCard titleLine={titleLine} footerLine={footerLine} isCurrent={isCurrent} />
  );
}

function DualValueDisplay({
  pauranikLabel,
  vedicLabel,
  differs,
}: {
  pauranikLabel?: string;
  vedicLabel?: string;
  differs?: boolean;
}) {
  const showStrike =
    differs ??
    (pauranikLabel != null && vedicLabel != null && pauranikLabel !== vedicLabel);

  if (!pauranikLabel && !vedicLabel) {
    return <Text>—</Text>;
  }

  return (
    <View className="flex flex-col gap-0.5">
      {showStrike && pauranikLabel ? (
        <Text className="text-body line-through">{pauranikLabel}</Text>
      ) : null}
      <Text className="font-semibold">{vedicLabel ?? pauranikLabel}</Text>
    </View>
  );
}

export function RituSection({ p }: { p: PanchangaDay }) {
  const { lang } = useLocale();
  const rituPauranik = getRituPauranik(p);
  const rituVedic = getRituVedic(p);
  const aayanPauranik = getAayanPauranik(p);
  const aayanVedic = getAayanVedic(p);

  return (
    <PanchangaSection titleKey="sections.ritu_ayana">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.ritu">
          <DualValueDisplay
            pauranikLabel={formatRituLabel(rituPauranik, lang)}
            vedicLabel={formatRituLabel(rituVedic, lang)}
            differs={rituPauranik?.name !== rituVedic?.name}
          />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ayana">
          <DualValueDisplay
            pauranikLabel={formatAayanLabel(aayanPauranik, lang)}
            vedicLabel={formatAayanLabel(aayanVedic, lang)}
            differs={aayanPauranik?.name !== aayanVedic?.name}
          />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.dinamana" nowrap>
          <Text className="font-mono font-semibold">
            {formatDurationFull(p, "dinamaan", lang) ?? "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ratrimana" nowrap>
          <Text className="font-mono font-semibold">
            {formatDurationFull(p, "ratrimana", lang) ?? "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.madhyahna" nowrap>
          <Text className="font-mono font-semibold">
            {formatMadhyahnaDisplay(p, lang) ?? "—"}
          </Text>
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function MuhurtaTimingValue({
  value,
  variant,
}: {
  value: string;
  variant: "good" | "bad";
}) {
  const lines = value.split("\n").filter(Boolean);
  if (lines.length === 1 && lines[0].includes(" – ") && !lines[0].includes("सम्म")) {
    const [start, end] = lines[0].split(" – ");
    return (
      <TimingRange
        start={start}
        end={end?.split(" (")[0]}
        variant={variant}
      />
    );
  }
  return (
    <View
      className={
        variant === "good"
          ? "flex flex-col gap-1 text-emerald-800 dark:text-emerald-300"
          : "flex flex-col gap-1 text-rose-800 dark:text-rose-300"
      }
    >
      {lines.map((line) => (
        <Text key={line} className="text-body">
          {line}
        </Text>
      ))}
    </View>
  );
}

export function MuhurtaTimingsSection({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const rows = getMuhurtaRows(p, lang);
  const good = rows.filter((r) => r.auspicious);
  const bad = rows.filter((r) => !r.auspicious);

  if (!rows.length) return null;

  if (good.length > 0 && bad.length > 0) {
    return (
      <PanchangaSection titleKey="sections.muhurta_timings">
        <PanchangaTableBody>
          <PanchangaGroupLabel>{t("sections.auspicious_timings")}</PanchangaGroupLabel>
          {good.map((row) => (
            <PanchangaFieldCell key={row.label} label={row.label}>
              <MuhurtaTimingValue value={row.value} variant="good" />
            </PanchangaFieldCell>
          ))}
          <PanchangaGroupLabel className="pt-3">{t("sections.inauspicious_timings")}</PanchangaGroupLabel>
          {bad.map((row) => (
            <PanchangaFieldCell key={row.label} label={row.label}>
              <MuhurtaTimingValue value={row.value} variant="bad" />
            </PanchangaFieldCell>
          ))}
        </PanchangaTableBody>
      </PanchangaSection>
    );
  }

  return (
    <>
      {good.length > 0 && (
        <PanchangaSection titleKey="sections.auspicious_timings">
          <PanchangaTableBody>
            {good.map((row) => (
              <PanchangaFieldCell key={row.label} label={row.label}>
                <MuhurtaTimingValue value={row.value} variant="good" />
              </PanchangaFieldCell>
            ))}
          </PanchangaTableBody>
        </PanchangaSection>
      )}
      {bad.length > 0 && (
        <PanchangaSection titleKey="sections.inauspicious_timings">
          <PanchangaTableBody>
            {bad.map((row) => (
              <PanchangaFieldCell key={row.label} label={row.label}>
                <MuhurtaTimingValue value={row.value} variant="bad" />
              </PanchangaFieldCell>
            ))}
          </PanchangaTableBody>
        </PanchangaSection>
      )}
    </>
  );
}

function NivasDirectionValue({
  segment,
}: {
  segment?: NivasShoolSegment | null;
}) {
  const { pick } = useLocale();
  if (!segment) return <Text>—</Text>;
  const name = pick(segment.name_ne ?? segment.name_en ?? "—", segment.name_en ?? segment.name_ne ?? "—");
  return <Text className="font-semibold">{name}</Text>;
}

function NivasTimedSegments({
  segments,
  showSubtitle = false,
  showGuna = false,
}: {
  segments?: NivasShoolSegment[];
  showSubtitle?: boolean;
  showGuna?: boolean;
}) {
  const { t } = useTranslation();
  const { pick } = useLocale();
  if (!segments?.length) return <Text>—</Text>;

  return (
    <View className="flex flex-col gap-1 min-w-0">
      {segments.map((seg, idx) => {
        const name = pick(seg.name_ne ?? seg.name_en ?? "—", seg.name_en ?? seg.name_ne ?? "—");
        const subtitle = showSubtitle
          ? pick(seg.subtitle_ne ?? seg.subtitle_en ?? "", seg.subtitle_en ?? seg.subtitle_ne ?? "")
          : "";
        const endTime = seg.end_local_time_short
          ? toNepaliDigits(formatTimeShort(seg.end_local_time_short) ?? seg.end_local_time_short)
          : undefined;
        const gunaLabel =
          showGuna && seg.is_auspicious !== undefined
            ? seg.is_auspicious
              ? t("sections.nivas_auspicious")
              : t("sections.nivas_inauspicious")
            : undefined;
        const fromTime = seg.start_local_time_short
          ? toNepaliDigits(formatTimeShort(seg.start_local_time_short) ?? seg.start_local_time_short)
          : undefined;

        return (
          <View key={`${name}-${idx}`} className="min-w-0">
            {fromTime && !endTime ? (
              <Text className="font-semibold">
                {subtitle ? `${name} (${subtitle})` : name}
                {" "}
                <Text className="text-body font-mono font-semibold text-foreground">
                  {t("sections.nivas_from")} {fromTime} {t("sections.nivas_to_full_night")}
                </Text>
              </Text>
            ) : (
              <UptoValue
                name={subtitle ? `${name} (${subtitle})` : name}
                endTime={endTime}
                badge={gunaLabel}
              />
            )}
            {seg.until_full_night && idx === segments.length - 1 && segments.length > 1 && !endTime ? (
              <Text className="text-body font-mono font-semibold text-foreground">
                {t("sections.nivas_to_full_night")}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function NivasShoolSection({
  p,
  fallback,
}: {
  p: PanchangaDay;
  fallback?: PanchangaDay | null;
}) {
  const ns = getNivasShool(p) ?? (fallback ? getNivasShool(fallback) : undefined);
  if (!ns) return null;

  const disha = ns.disha_shool;
  const rahu = ns.rahu_vasa;

  return (
    <PanchangaSection titleKey="sections.nivas_shool">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.homahuti">
          <NivasTimedSegments segments={ns.homahuti?.segments} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.disha_shool" nowrap>
          <NivasDirectionValue segment={disha} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.rahu_vasa" nowrap>
          <NivasDirectionValue segment={rahu} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.agnivasa">
          <NivasTimedSegments segments={ns.agnivasa?.segments} showSubtitle />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.chandra_vasa">
          <NivasTimedSegments segments={ns.chandra_vasa?.segments} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shivavasa">
          <NivasTimedSegments segments={ns.shivavasa?.segments} />
        </PanchangaFieldCell>
        {ns.bhadravasa?.active ? (
          <PanchangaFieldCell labelKey="sections.bhadravasa">
            <NivasTimedSegments segments={ns.bhadravasa.segments} showSubtitle />
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.kumbha_chakra">
          <NivasTimedSegments segments={ns.kumbha_chakra?.segments} showGuna />
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function DinVisheshSection({ p }: { p: PanchangaDay }) {
  const { lang } = useLocale();
  const labels = getDinVisheshLabels(p, [], lang);
  if (!labels.length) return null;

  return (
    <PanchangaSection titleKey="sections.special_observances">
      <View className={panchangaCardGrid}>
        {labels.map((label) => (
          <Text
            key={label}
            className="text-body font-semibold px-2.5 py-1.5 rounded-full bg-secondary/12 text-secondary dark:text-accent border border-secondary/20"
            style={nepaliTextStyle(14)}
          >
            {label}
          </Text>
        ))}
      </View>
    </PanchangaSection>
  );
}

export function PlanetsPanel({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang, pick } = useLocale();
  const planets = getPlanetRows(p);
  const lagna = getLagnaDisplay(p);
  if (!planets.length && !lagna) return null;

  return (
    <View className="rounded-xl bg-card p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      <View className="flex items-baseline gap-2 mb-2">
        <Text className="text-body font-bold m-0">{t("sections.planet_positions")}</Text>
        <Text className="text-body">{getPlanetsAnchorLabel(p, lang)}</Text>
      </View>
      <View className="flex flex-col">
        {lagna && (
          <View className="flex items-center gap-3 py-2 border-b border-border">
            <Text className="text-body w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/11 text-secondary dark:text-accent shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              {pick("लग्न", "ASC")}
            </Text>
            <View className="min-w-0 flex-1">
              <Text className="text-body font-semibold">{t("sections.lagna")}</Text>
              <Text className="text-body">
                {formatRashiDisplay(lagna.nameNe, undefined, lang) ?? lagna.nameNe}
              </Text>
            </View>
            {lagna.degree && (
              <Text className="text-body font-mono font-semibold text-foreground whitespace-nowrap">
                {lagna.degree}°
              </Text>
            )}
          </View>
        )}
        {planets.map(({ key, label, labelEn, rashiNe, rashiEn, coords, isRetrograde, isCombust }) => (
          <View
            key={key}
            className="flex flex-row flex-wrap items-start gap-x-3 gap-y-1 py-2 border-b border-border last:border-0"
          >
            <GrahaPlanetIcon graha={key as GrahaKey} size={32} />
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Text className="text-body font-semibold">{pick(label, labelEn)}</Text>
                <GrahaStatusBadges planetKey={key} isRetrograde={isRetrograde} isCombust={isCombust} />
              </View>
              {(rashiNe || rashiEn) ? (
                <Text className="text-body">
                  {formatRashiDisplay(rashiNe, rashiEn, lang) ?? pick(rashiNe ?? "", rashiEn ?? "")}
                </Text>
              ) : null}
            </View>
            <Text className="text-body font-mono font-semibold text-foreground">
              {coords}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FestivalsSection({ p }: { p: PanchangaDay }) {
  const { pick } = useLocale();
  const festivals = p.festivals ?? [];
  if (!festivals.length) return null;

  return (
    <PanchangaSection titleKey="sections.festivals">
      <View className={panchangaCardGrid}>
        {festivals.map((f) => (
          <Text
            key={f.id}
            className={
              f.is_public_holiday
                ? "text-body font-semibold px-2.5 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                : "text-body font-semibold px-2.5 py-1.5 rounded-full bg-secondary/12 text-secondary dark:text-accent border border-secondary/20"
            }
            style={nepaliTextStyle(14)}
          >
            {pick(f.name_ne ?? f.name ?? "", f.name_en ?? f.name ?? f.name_ne ?? "")}
          </Text>
        ))}
      </View>
    </PanchangaSection>
  );
}
