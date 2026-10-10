import type { PanchangaDay } from "@/lib/api";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useTranslation } from "react-i18next";
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
  getVaaraEn,
  getVaaraNe,
  formatSpanEndTime,
  getChandrabalamTable,
  getNakshatraPadaSpans,
  getPanchakaRahita,
  getTarabalaTable,
  getUdayaLagna,
  formatShortClock,
  formatTimeRangeShort,
  getNivasShool,
  toNepaliDigits,
  getSunriseHours,
  angaEndDayOffset,
  dayOffsetLabel,
} from "@/lib/panchanga-format";
import { formatRashiDisplay } from "@/lib/rashi-i18n";
import type { NivasShoolSegment } from "@/lib/api";
import { shortWeekdayNe } from "@/lib/bs-calendar";
import { resolveSamvatsaraForBsYear } from "@/lib/samvatsara";
import {
  findCurrentUdayaLagna,
  getChandraBalamCards,
  getTaraBalamCards,
  type BalamCardItem,
} from "@/lib/balam-cards";
import type { UdayaLagnaRow } from "@/lib/api";
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
import { NavataraBalamCardGrid } from "./NavataraBalamCardGrid";
import { useLocale, bilingualText } from "@/i18n/locale";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { tithiIndexFromPanchanga } from "@/lib/tithi-wheel-data";

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

/** End-time with a भोलि / पर्सि prefix when the transition falls on a later day. */
function angaEndWithDay(
  anga: Anga | AngaEnd | null | undefined,
  sunriseHours: number | undefined,
  lang: string,
): string | undefined {
  const time = angaEndTime(anga);
  if (!time) return undefined;
  const label = dayOffsetLabel(angaEndDayOffset(anga, sunriseHours), lang);
  return label ? `${label} ${time}` : time;
}

function AngaCell({ anga, sunriseHours }: { anga?: Anga | null; sunriseHours?: number }) {
  const { lang } = useLocale();
  if (!anga) return <span>—</span>;
  const name = bilingualText(lang, anga.name_ne ?? anga.name ?? "—", anga.name ?? anga.name_ne ?? "—");
  const next = anga.next;
  const nextName = next?.name_ne ?? next?.name;
  return (
    <>
      <UptoValue name={name} endTime={angaEndWithDay(anga, sunriseHours, lang)} />
      {nextName ? (
        // The next anga now carries its own end time — on a kshaya-tithi day
        // this is where the skipped tithi's ending shows (e.g. प्रतिपदा … सम्म).
        <UptoValue
          name={bilingualText(lang, nextName, next?.name ?? next?.name_ne ?? nextName)}
          endTime={angaEndWithDay(next, sunriseHours, lang)}
        />
      ) : null}
    </>
  );
}

export function SunMoonSamvatSection({ p }: { p: PanchangaDay }) {
  const { lang, digits } = useLocale();
  const solar = getSolarCorrections(p);
  const belaantar = formatSolarCorrectionDisplay(solar?.belaantar, lang);
  const deshaantar = formatSolarCorrectionDisplay(solar?.deshaantar, lang);
  const detail = getPanchangaDetail(p);
  const bs = (detail?.bs_date ?? p.bs_date) as
    | { year?: number; month_name_ne?: string; month_name?: string; day?: number }
    | undefined;
  const ns = formatNepalSambatDisplay(p, lang);
  const shaka = formatShakaYear(p);
  const samvatsara = bs?.year
    ? resolveSamvatsaraForBsYear(bs.year, p.samvatsara)
    : undefined;
  const pakshaLabel = formatPakshaLabel(p, lang) ?? "—";
  const tithiIdx = tithiIndexFromPanchanga(p);

  return (
    <PanchangaSection titleKey="sections.sun_moon_samvat">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.sunrise" nowrap>
          <span>🌅</span>
          <span className="font-mono font-semibold">{getSunriseDisplay(p) ?? "—"}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.sunset" nowrap>
          <span>🌇</span>
          <span className="font-mono font-semibold">{getSunsetDisplay(p) ?? "—"}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonrise" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} className="size-4 shrink-0" />
          <span className="font-mono font-semibold">{getMoonriseDisplay(p, lang) ?? "—"}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonset" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} className="size-4 shrink-0" />
          <span className="font-mono font-semibold">{getMoonsetDisplay(p, lang) ?? "—"}</span>
        </PanchangaFieldCell>
        {belaantar ? (
          <PanchangaFieldCell labelKey="sections.equation_of_time" nowrap>
            <span className="font-mono font-semibold">{belaantar}</span>
          </PanchangaFieldCell>
        ) : null}
        {deshaantar ? (
          <PanchangaFieldCell labelKey="sections.longitude_correction" nowrap>
            <span className="font-mono font-semibold">{deshaantar}</span>
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <span className="font-semibold">{pakshaLabel}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.vikram" nowrap>
          <span className="font-semibold">
            {bs?.year && bs.day && (bs.month_name_ne || bs.month_name)
              ? `${digits(bs.year)} ${bilingualText(lang, bs.month_name_ne ?? bs.month_name ?? "", bs.month_name ?? bs.month_name_ne ?? "")} ${digits(bs.day)}`
              : (p.display?.bs_ne ?? "—")}
          </span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.samvatsara" nowrap>
          <span className="font-semibold">
            {samvatsara ? bilingualText(lang, samvatsara.name_ne, samvatsara.name_en) : "—"}
          </span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shaka" nowrap>
          <span className="font-semibold">{shaka ? digits(shaka) : "—"}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.nepal_sambat" nowrap>
          <span className="font-semibold">{ns ?? "—"}</span>
        </PanchangaFieldCell>
      </PanchangaTableBody>
      {solar?.ishtakaal_note_ne || solar?.ishtakaal_note_en ? (
        <p className="border-t border-border px-4 py-2 text-sm m-0 leading-snug">
          {bilingualText(lang, 
            solar.ishtakaal_note_ne ?? "",
            solar.ishtakaal_note_en ?? solar.ishtakaal_note_ne ?? "",
          )}
        </p>
      ) : null}
    </PanchangaSection>
  );
}

export function PanchangCoreSection({ p }: { p: PanchangaDay }) {
  const { lang } = useLocale();
  const detail = getPanchangaDetail(p);
  const instant = p.mode === "ephemeris";
  const tithi = (instant ? p.tithi : detail?.tithi ?? p.tithi) as Anga | undefined;
  const nakshatra = (instant ? p.nakshatra : detail?.nakshatra ?? p.nakshatra) as Anga | undefined;
  const yoga = (instant ? p.yoga : detail?.yoga ?? p.yoga) as Anga | undefined;
  const karana = (instant ? p.karana : detail?.karana ?? p.karana) as Anga | undefined;
  const paksha = formatPakshaLabel(p, lang) ?? formatPakshaNepaliDisplay(p);
  const tithiIdx = tithiIndexFromPanchanga(p);
  // दिन-रात payloads measure anga end-times from midnight (not sunrise), so the
  // भोलि/पर्सि day-offset must count from a 00:00 origin — pass 0 in that mode.
  const sunriseHours = p.boundary === "midnight" ? 0 : getSunriseHours(p);

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
          {/* सोमवार is wide for a half-width card; drop to सोम on phones. */}
          <span className="font-semibold sm:hidden">
            {bilingualText(
              lang,
              shortWeekdayNe(getVaaraNe(p, p.weekday)) ?? "—",
              getVaaraEn(p, p.weekday) ?? "—",
            )}
          </span>
          <span className="hidden font-semibold sm:inline">
            {bilingualText(lang, getVaaraNe(p, p.weekday) ?? "—", getVaaraEn(p, p.weekday) ?? "—")}
          </span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={tithiIdx} className="size-4 shrink-0" />
          <span className="font-semibold">{paksha ?? "—"}</span>
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function RashiSection({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const padaSpans = getNakshatraPadaSpans(p);

  if (!padaSpans?.length) return null;

  return (
    <PanchangaSection titleKey="sections.pada_detail">
      <PanchangaTableBody>
        {padaSpans.map((span, i) => {
          const nakName = bilingualText(lang, 
            span.nakshatra_name_ne ?? span.nakshatra_name ?? "",
            span.nakshatra_name ?? span.nakshatra_name_ne ?? "",
          );
          const padaLabel = bilingualText(lang, 
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
              <span className="font-mono font-semibold">
                {endTime ? `${endTime} ${t("sections.until")}` : "—"}
              </span>
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
}: {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
}) {
  return (
    <NavataraBalamCardGrid cards={cards} clock={clock} formatName={formatName} lang={lang} />
  );
}

function BalamKindBlock({
  label,
  moonRef,
  cards,
  clock,
  formatName,
  lang,
}: {
  label: string;
  moonRef?: string;
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
}) {
  if (!cards.length) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-border/80 px-4 py-3 last:border-b-0">
      <PanchangaGroupLabel className="px-0 pt-0">{label}</PanchangaGroupLabel>
      {moonRef ? (
        <p className="m-0 text-center text-sm text-muted-foreground">{moonRef}</p>
      ) : null}
      <BalamCardGrid cards={cards} clock={clock} formatName={formatName} lang={lang} />
    </div>
  );
}

export function BalamSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const chandraCards = getChandraBalamCards(p);
  const taraCards = getTaraBalamCards(p);
  const chandraTable = getChandrabalamTable(p);
  const taraTable = getTarabalaTable(p);

  if (!chandraCards.length && !taraCards.length) {
    return null;
  }

  const chandraMoonRef = chandraTable?.moon_label
    ? bilingualText(lang, 
        `सूर्योदयको चन्द्र राशि: ${chandraTable.moon_label}`,
        `Moon sign at sunrise: ${chandraTable.moon_label_en ?? chandraTable.moon_label}`,
      )
    : undefined;
  const taraMoonRef = taraTable?.moon_label
    ? bilingualText(lang, 
        `सूर्योदयको चन्द्र नक्षत्र: ${taraTable.moon_label}`,
        `Moon nakshatra at sunrise: ${taraTable.moon_label_en ?? taraTable.moon_label}`,
      )
    : undefined;

  const formatRashiName = (card: BalamCardItem) =>
    formatRashiDisplay(card.name, card.nameEn, lang) ?? bilingualText(lang, card.name, card.nameEn ?? card.name);
  const formatNakName = (card: BalamCardItem) => bilingualText(lang, card.name, card.nameEn ?? card.name);

  return (
    <PanchangaSection titleKey="sections.balam">
      <BalamKindBlock
        label={t("muhurta_aside.chandrabal")}
        moonRef={chandraMoonRef}
        cards={chandraCards}
        clock={clock}
        formatName={formatRashiName}
        lang={lang}
      />
      <BalamKindBlock
        label={t("muhurta_aside.tarabal")}
        moonRef={taraMoonRef}
        cards={taraCards}
        clock={clock}
        formatName={formatNakName}
        lang={lang}
      />
    </PanchangaSection>
  );
}

export function PanchakaLagnaSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
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
                label={bilingualText(lang, pr.name_ne ?? pr.name ?? "—", pr.name ?? pr.name_ne ?? "—")}
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
            <div className={panchangaCardGrid}>
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
            </div>
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
    <>
      {rashi}
      {timeRange ? (
        <>
          {" "}
          <span className="font-mono font-semibold tabular-nums">{timeRange}</span>
        </>
      ) : null}
    </>
  );

  const footerLine =
    pushkaraTimes.length > 0 ? (
      <>
        {pushkaraLabel}{" "}
        <span className="font-mono tabular-nums text-foreground">{pushkaraTimes}</span>
      </>
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
    return <span>—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {showStrike && pauranikLabel ? (
        <span className="line-through text-base">{pauranikLabel}</span>
      ) : null}
      <span className="font-semibold">{vedicLabel ?? pauranikLabel}</span>
    </div>
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
          <span className="font-mono font-semibold">
            {formatDurationFull(p, "dinamaan", lang) ?? "—"}
          </span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ratrimana" nowrap>
          <span className="font-mono font-semibold">
            {formatDurationFull(p, "ratrimana", lang) ?? "—"}
          </span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.madhyahna" nowrap>
          <span className="font-mono font-semibold">
            {formatMadhyahnaDisplay(p, lang) ?? "—"}
          </span>
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
    <div
      className={
        variant === "good"
          ? "flex flex-col gap-1 text-emerald-800 dark:text-emerald-300"
          : "flex flex-col gap-1 text-rose-800 dark:text-rose-300"
      }
    >
      {lines.map((line) => (
        <span key={line} className="text-sm text-base leading-snug">
          {line}
        </span>
      ))}
    </div>
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
  const { lang } = useLocale();
  if (!segment) return <span>—</span>;
  const name = bilingualText(lang, segment.name_ne ?? segment.name_en ?? "—", segment.name_en ?? segment.name_ne ?? "—");
  return <span className="font-semibold">{name}</span>;
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
  const { lang } = useLocale();
  if (!segments?.length) return <span>—</span>;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      {segments.map((seg, idx) => {
        const name = bilingualText(lang, seg.name_ne ?? seg.name_en ?? "—", seg.name_en ?? seg.name_ne ?? "—");
        const subtitle = showSubtitle
          ? bilingualText(lang, seg.subtitle_ne ?? seg.subtitle_en ?? "", seg.subtitle_en ?? seg.subtitle_ne ?? "")
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
          <div key={`${name}-${idx}`} className="min-w-0">
            {fromTime && !endTime ? (
              <span className="font-semibold">
                {subtitle ? `${name} (${subtitle})` : name}
                {" "}
                <span className="text-sm font-mono font-semibold text-foreground">
                  {t("sections.nivas_from")} {fromTime} {t("sections.nivas_to_full_night")}
                </span>
              </span>
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
              // Bare "runs through the night" state with no start time of its own.
              // When a fromTime exists the branch above already renders the
              // "देखि … सम्पूर्ण रातसम्म" phrase, so this would duplicate it.
              <span className="text-sm font-mono font-semibold text-foreground">
                {t("sections.nivas_to_full_night")}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
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
      <div className={panchangaCardGrid}>
        {labels.map((label) => (
          <span
            key={label}
            className="text-sm font-semibold px-2.5 py-1.5 rounded-full bg-secondary/12 text-secondary dark:text-accent border border-secondary/20"
          >
            {label}
          </span>
        ))}
      </div>
    </PanchangaSection>
  );
}

export function PlanetsPanel({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const planets = getPlanetRows(p);
  const lagna = getLagnaDisplay(p);
  if (!planets.length && !lagna) return null;

  return (
    <div className="rounded-xl bg-card p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      <div className="mb-2 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
        <h2 className="m-0 shrink-0 text-base font-bold">{t("sections.planet_positions")}</h2>
        <span className="min-w-0 text-sm break-words [overflow-wrap:anywhere]">
          {getPlanetsAnchorLabel(p, lang)}
        </span>
      </div>
      <div className="flex flex-col">
        {lagna && (
          <div className="flex items-center gap-3 py-2 border-b border-border">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-secondary/11 text-secondary dark:text-accent shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              {bilingualText(lang, "लग्न", "ASC")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t("sections.lagna")}</div>
              <div className="text-sm">
                {formatRashiDisplay(lagna.nameNe, undefined, lang) ?? lagna.nameNe}
              </div>
            </div>
            {lagna.degree && (
              <span className="font-mono text-sm font-semibold text-foreground break-all [overflow-wrap:anywhere]">
                {lagna.degree}°
              </span>
            )}
          </div>
        )}
        {planets.map(({ key, label, labelEn, rashiNe, rashiEn, coords, isRetrograde, isCombust }) => (
          <div
            key={key}
            className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 border-b border-border last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold break-words">
                {bilingualText(lang, label, labelEn)}
                <GrahaStatusBadges planetKey={key} isRetrograde={isRetrograde} isCombust={isCombust} />
              </div>
              {(rashiNe || rashiEn) && (
                <div className="text-sm break-words">
                  {formatRashiDisplay(rashiNe, rashiEn, lang) ?? bilingualText(lang, rashiNe ?? "", rashiEn ?? "")}
                </div>
              )}
            </div>
            <span className="font-mono text-sm font-semibold text-foreground break-all [overflow-wrap:anywhere]">
              {coords}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FestivalsSection({ p }: { p: PanchangaDay }) {
  const { lang } = useLocale();
  const festivals = p.festivals ?? [];
  if (!festivals.length) return null;

  return (
    <PanchangaSection titleKey="sections.festivals">
      <div className={panchangaCardGrid}>
        {festivals.map((f) => (
          <span
            key={f.id}
            className={
              f.is_public_holiday
                ? "text-sm font-semibold px-2.5 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                : "text-sm font-semibold px-2.5 py-1.5 rounded-full bg-secondary/12 text-secondary dark:text-accent border border-secondary/20"
            }
          >
            {bilingualText(lang, f.name_ne ?? f.name ?? "", f.name_en ?? f.name ?? f.name_ne ?? "")}
          </span>
        ))}
      </div>
    </PanchangaSection>
  );
}
