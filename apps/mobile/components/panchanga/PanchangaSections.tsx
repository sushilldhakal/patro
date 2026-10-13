import { cn } from "@vedic-patro/domain/utils";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
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
  angaEndOrigin,
  angaEndWithDay,
} from "@vedic-patro/domain/panchanga-format";
import type { NivasShoolSegment, UdayaLagnaRow } from "@/lib/api";
import { resolveSamvatsaraForBsYear } from "@vedic-patro/domain/samvatsara";
import {
  findCurrentUdayaLagna,
  getChandraBalamCards,
  getTaraBalamCards,
  type BalamCardItem,
} from "@vedic-patro/domain/balam-cards";
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
  panchangaSectionNote,
} from "./PanchangaLayout";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { NavataraBalamCardGrid } from "./NavataraBalamCardGrid";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { tithiIndexFromPanchanga } from "@vedic-patro/domain/tithi-wheel-data";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

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


function AngaCell({ anga, sunriseHours }: { anga?: Anga | null; sunriseHours?: number }) {
  const { pick, lang } = useLocale();
  if (!anga) return <Text>—</Text>;
  const name = pick(anga.name_ne ?? anga.name ?? "—", anga.name ?? anga.name_ne ?? "—");
  const next = anga.next;
  const nextName = next?.name_ne ?? next?.name;
  return (
    <>
      <UptoValue name={name} endTime={angaEndWithDay(anga, sunriseHours, lang)} />
      {nextName ? (
        // The next anga now carries its own end time — on a kshaya-tithi day
        // this is where the skipped tithi's ending shows (e.g. प्रतिपदा … सम्म).
        <UptoValue
          name={pick(nextName, next?.name ?? next?.name_ne ?? nextName)}
          endTime={angaEndWithDay(next, sunriseHours, lang)}
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
          <Text className={panchangaPageClasses.sections.mono}>{getSunriseDisplay(p) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.sunset" nowrap>
          <Text>🌇</Text>
          <Text className={panchangaPageClasses.sections.mono}>{getSunsetDisplay(p) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonrise" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className={panchangaPageClasses.sections.mono}>{getMoonriseDisplay(p, lang) ?? "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonset" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className={panchangaPageClasses.sections.mono}>{getMoonsetDisplay(p, lang) ?? "—"}</Text>
        </PanchangaFieldCell>
        {belaantar ? (
          <PanchangaFieldCell labelKey="sections.equation_of_time" nowrap>
            <Text className={panchangaPageClasses.sections.mono}>{belaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        {deshaantar ? (
          <PanchangaFieldCell labelKey="sections.longitude_correction" nowrap>
            <Text className={panchangaPageClasses.sections.mono}>{deshaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>{pakshaLabel}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.vikram" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>
            {bs?.year && bs.day && (bs.month_name_ne || bs.month_name)
              ? `${digits(bs.year)} ${pick(bs.month_name_ne ?? bs.month_name ?? "", bs.month_name ?? bs.month_name_ne ?? "")} ${digits(bs.day)}`
              : (p.display?.bs_ne ?? "—")}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.samvatsara" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>
            {samvatsara ? pick(samvatsara.name_ne, samvatsara.name_en) : "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shaka" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>{shaka ? digits(shaka) : "—"}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.nepal_sambat" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>{ns ?? "—"}</Text>
        </PanchangaFieldCell>
      </PanchangaTableBody>
      {solar?.ishtakaal_note_ne ? (
        <Text className={panchangaSectionNote}>
          {pick(solar.ishtakaal_note_ne ?? "", solar.ishtakaal_note_en ?? solar.ishtakaal_note_ne ?? "")}
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
  // दिन-रात payloads measure anga end-times from midnight (not sunrise), so the
  // भोलि/पर्सि day-offset must count from a 00:00 origin.
  const sunriseHours = angaEndOrigin(p);

  return (
    <PanchangaSection titleKey="sections.panchang_core">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="tithi">
          <AngaCell anga={tithi} sunriseHours={sunriseHours} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="nakshatra">
          <AngaCell anga={nakshatra} sunriseHours={sunriseHours} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.yoga">
          <AngaCell anga={yoga} sunriseHours={sunriseHours} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.karana">
          <AngaCell anga={karana} sunriseHours={sunriseHours} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.weekday" nowrap>
          <Text className={panchangaPageClasses.sections.strong}>
            {pick(getVaaraNe(p, p.weekday) ?? "—", getVaaraEn(p, p.weekday) ?? "—")}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={16} />
          <Text className={panchangaPageClasses.sections.strong}>{paksha ?? "—"}</Text>
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
              <Text className={panchangaPageClasses.sections.mono}>
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
    <View className={cn("flex flex-col", panchangaPageClasses.sections.balamBlock)}>
      <PanchangaGroupLabel className="px-0 pt-0">{label}</PanchangaGroupLabel>
      {moonRef ? (
        <Text className={panchangaPageClasses.sections.moonRef}>{moonRef}</Text>
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
        <Text className={panchangaPageClasses.sections.monoTabular}> {timeRange}</Text>
      ) : null}
    </Text>
  );

  const footerLine =
    pushkaraTimes.length > 0 ? (
      <Text>
        {pushkaraLabel}{" "}
        <Text className={panchangaPageClasses.sections.monoPlain}>{pushkaraTimes}</Text>
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
    <View className={cn("flex flex-col", panchangaPageClasses.sections.dual)}>
      {showStrike && pauranikLabel ? (
        <Text className={panchangaPageClasses.sections.strike}>{pauranikLabel}</Text>
      ) : null}
      <Text className={panchangaPageClasses.sections.strong}>{vedicLabel ?? pauranikLabel}</Text>
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
          <Text className={panchangaPageClasses.sections.mono}>
            {formatDurationFull(p, "dinamaan", lang) ?? "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ratrimana" nowrap>
          <Text className={panchangaPageClasses.sections.mono}>
            {formatDurationFull(p, "ratrimana", lang) ?? "—"}
          </Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.madhyahna" nowrap>
          <Text className={panchangaPageClasses.sections.mono}>
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
          ? cn("flex flex-col", panchangaPageClasses.sections.timingGood)
          : cn("flex flex-col", panchangaPageClasses.sections.timingBad)
      }
    >
      {lines.map((line) => (
        <Text
          key={line}
          className={cn(
            panchangaPageClasses.sections.timingLine,
            variant === "good"
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-rose-800 dark:text-rose-300",
          )}
        >
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
  return <Text className={panchangaPageClasses.sections.strong}>{name}</Text>;
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
    <View className={cn("flex flex-col", panchangaPageClasses.sections.nivasList)}>
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
          <View key={`${name}-${idx}`} className={panchangaPageClasses.sections.nivasItem}>
            {fromTime && !endTime ? (
              <Text className={panchangaPageClasses.sections.strong}>
                {subtitle ? `${name} (${subtitle})` : name}
                {" "}
                <Text className={panchangaPageClasses.sections.nivasTime}>
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
            {seg.until_full_night &&
            idx === segments.length - 1 &&
            segments.length > 1 &&
            !endTime &&
            !fromTime ? (
              <Text className={panchangaPageClasses.sections.nivasTime}>
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
            className={panchangaPageClasses.sections.chipFestival}
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
    <View className={panchangaPageClasses.sections.planetsPanel}>
      <View className={cn("flex flex-col", panchangaPageClasses.sections.planetsHead)}>
        <Text className={panchangaPageClasses.sections.planetsTitle}>{t("sections.planet_positions")}</Text>
        <Text className={panchangaPageClasses.sections.planetsAnchor}>{getPlanetsAnchorLabel(p, lang)}</Text>
      </View>
      <View className={cn("flex", panchangaPageClasses.sections.planetsList)}>
        {lagna && (
          <View className={cn("flex", panchangaPageClasses.sections.lagnaRow)}>
            <Text className={cn("flex", panchangaPageClasses.sections.lagnaBadge)}>
              {pick("लग्न", "ASC")}
            </Text>
            <View className={panchangaPageClasses.sections.lagnaBody}>
              <Text className={panchangaPageClasses.sections.lagnaTitle}>{t("sections.lagna")}</Text>
              <Text className={panchangaPageClasses.sections.lagnaSign}>
                {formatRashiDisplay(lagna.nameNe, undefined, lang) ?? lagna.nameNe}
              </Text>
            </View>
            {lagna.degree && (
              <Text className={panchangaPageClasses.sections.planetCoords}>
                {lagna.degree}°
              </Text>
            )}
          </View>
        )}
        {planets.map(({ key, label, labelEn, rashiNe, rashiEn, coords, isRetrograde, isCombust }) => (
          <View
            key={key}
            className={cn("flex", panchangaPageClasses.sections.planetRow)}
          >
            <GrahaPlanetIcon graha={key as GrahaKey} size={32} />
            <View className={panchangaPageClasses.sections.planetBody}>
              <View className={panchangaPageClasses.sections.planetNameRow}>
                <Text className={panchangaPageClasses.sections.planetName}>{pick(label, labelEn)}</Text>
                <GrahaStatusBadges planetKey={key} isRetrograde={isRetrograde} isCombust={isCombust} />
              </View>
              {(rashiNe || rashiEn) ? (
                <Text className={panchangaPageClasses.sections.planetRashi}>
                  {formatRashiDisplay(rashiNe, rashiEn, lang) ?? pick(rashiNe ?? "", rashiEn ?? "")}
                </Text>
              ) : null}
            </View>
            <Text className={panchangaPageClasses.sections.nivasTime}>
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
                ? panchangaPageClasses.sections.chipHoliday
                : panchangaPageClasses.sections.chipFestival
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
