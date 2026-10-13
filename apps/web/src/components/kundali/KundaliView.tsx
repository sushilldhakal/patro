import { lazy, Suspense, useMemo, useState } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { Clock, Flame, MapPin } from "lucide-react";
import {
  fetchKundaliDetail,
  kundaliDetailKeys,
  locationCacheKey,
  type BilingualValue,
  type KundaliDetailResponse,
  type LocationParams,
  type PanchangaDay,
  type PlanetInfo,
} from "@/lib/api";
import { normalizeEphemerisDay } from "@vedic-patro/domain/ephemeris-adapters";
import { instantCacheKey, type InstantQuery } from "@vedic-patro/domain/instant-query";
import { formatMomentDateLabel } from "@vedic-patro/domain/kundali/profile-chart";
import {
  getInstantLagna,
  getLagnaDisplay,
  getPanchangaDetail,
  getSunriseDisplay,
  getSunsetDisplay,
  getSuryaRashi,
  getVaaraNe,
  formatTithiWithPaksha,
} from "@vedic-patro/domain/panchanga-format";
import { getAyanamshaModeInfo, type AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { resolveTimeZone } from "@vedic-patro/domain/zoned-time";
// DivisionalChartCompare stays a static import: it belongs to the default
// landing tab (kundali-overview), so it should arrive with the route chunk
// rather than costing that first view an extra chunk fetch. Every other
// section below is a nav tab a user may never open, so each is its own
// React.lazy chunk, fetched only when that section is actually shown.
import { DivisionalChartCompare } from "@/components/kundali/DivisionalChartCompare";
import type { GrahaAstroPoint } from "@/components/kundali/GrahaAstroTable";
import { d1AllJanmaPhalaBhavas } from "@vedic-patro/domain/bhava";
import { buildPresentYogaRefIds } from "@vedic-patro/domain/kundali/yoga-reference-map";
import { PanchangaSection } from "@/components/panchanga/PanchangaLayout";
import { formatGhadiPalaVipala } from "@vedic-patro/domain/birth-panchanga-meta";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { generateAvakahadaShloka } from "@vedic-patro/domain/avakahada-data";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { WHEEL_YOGAS } from "@vedic-patro/domain/tithi-wheel-data";
import {
  BALA_TAB_SECTIONS,
  contentSectionId,
  dashaSectionId,
  dashaSystemFromSection,
  type KundaliContentSectionId,
  type KundaliSectionId,
} from "@/components/kundali/KundaliSectionNav";
import { KundaliSubTabs } from "@/components/kundali/KundaliSubTabs";

import { tFor } from "@vedic-patro/i18n/runtime";
const GrahaAstroTable = lazy(() =>
  import("@/components/kundali/GrahaAstroTable").then((m) => ({ default: m.GrahaAstroTable })),
);
const UpagrahaTable = lazy(() =>
  import("@/components/kundali/UpagrahaTable").then((m) => ({ default: m.UpagrahaTable })),
);
const YogaList = lazy(() =>
  import("@/components/kundali/YogaList").then((m) => ({ default: m.YogaList })),
);
const YogaReferenceCatalog = lazy(() =>
  import("@/components/kundali/YogaReferenceCatalog").then((m) => ({
    default: m.YogaReferenceCatalog,
  })),
);
const DashaSystemPanel = lazy(() =>
  import("@/components/kundali/DashaSystemPanel").then((m) => ({ default: m.DashaSystemPanel })),
);
const ShadbalaCard = lazy(() =>
  import("@/components/kundali/ShadbalaCard").then((m) => ({ default: m.ShadbalaCard })),
);
const BhavaBalaCard = lazy(() =>
  import("@/components/kundali/BhavaBalaCard").then((m) => ({ default: m.BhavaBalaCard })),
);
const JanmaPhalaTables = lazy(() =>
  import("@/components/kundali/JanmaPhalaTables").then((m) => ({ default: m.JanmaPhalaTables })),
);
const VimshopakaCard = lazy(() => import("@/components/kundali/VimshopakaCard"));
const AshtakavargaCard = lazy(() =>
  import("@/components/kundali/AshtakavargaCard").then((m) => ({ default: m.AshtakavargaCard })),
);
const KundaliReport = lazy(() => import("@/components/kundali/KundaliReport"));
const ShantiVidhiPanel = lazy(() => import("@/components/kundali/ShantiVidhiPanel"));

/** Fallback for a lazy section chunk while it loads. */
function SectionLoading() {
  return (
    <div className={kundaliDetailClasses.view.sectionLoading}>
      <Clock className="mr-2 h-4 w-4 animate-pulse" />
    </div>
  );
}

function DetailTraitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(kundaliDetailClasses.birth.traitRow, kundaliDetailClasses.birth.traitText, "flex min-w-[9rem]")}>
      <span className="shrink-0">{label}</span>
      <span className="shrink-0">:</span>
      <span className={kundaliDetailClasses.prose.strong}>{value}</span>
    </div>
  );
}
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cn(kundaliDetailClasses.view.statTile, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]")}>
      <p className={kundaliDetailClasses.view.statTileLabel}>
        {label}
      </p>
      <p className="text-base font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className={kundaliDetailClasses.prose.smallMt05}>{sub}</p>}
    </div>
  );
}

type RawPlanet = PlanetInfo & {
  rashi_name?: string;
  is_retrograde?: boolean;
  latitude?: number;
  right_ascension?: number;
  declination?: number;
  speed?: number;
};

/** Astronomical extras per graha from the at-time panchanga planet block. */
function astroPointsFromPanchanga(p: PanchangaDay): Partial<Record<string, GrahaAstroPoint>> {
  const detail = getPanchangaDetail(p);
  const planets = (detail?.planets ?? p.planets) as Record<string, RawPlanet | string> | undefined;
  if (!planets) return {};
  const out: Partial<Record<string, GrahaAstroPoint>> = {};
  for (const [key, info] of Object.entries(planets)) {
    if (typeof info === "string") continue;
    out[key] = {
      longitude: info.longitude,
      retrograde: info.is_retrograde ?? info.retrograde,
      latitude: info.latitude,
      rightAscension: info.right_ascension,
      declination: info.declination,
      speed: info.speed,
    };
  }
  return out;
}

export interface KundaliViewProps {
  /** Birth moment as era + civil parts + clock — the API converts nothing else. */
  moment: InstantQuery;
  /** Resolved observer/location query params for the API. */
  locationParams: LocationParams | undefined;
  /** Human label for the birth place. */
  locationLabel: string;
  /** Ayanamsha mode applied to the chart. */
  ayanamshaMode: AyanamshaMode;
  /** Show the embedded Navagraha Shanti section for this kundali. Default true. */
  showShanti?: boolean;
  /** Hide the birth-moment hero (profile page shows birth facts in sidebar). */
  hideBirthSummary?: boolean;
  /** Profile page: show only this section (tab-style). Omit to show all sections. */
  section?: KundaliSectionId;
}


/**
 * Full birth-chart view for a single applied birth moment. Everything is
 * computed by the API's /kundali/detail endpoint — panchanga, divisional
 * charts, yogas, dasha tree, shadbala, bhava bala, ashtakavarga, avakahada —
 * so this component (and any future mobile client) only renders.
 */
export function KundaliView({
  moment: birthMoment,
  locationParams,
  locationLabel: locationLabelProp,
  ayanamshaMode,
  showShanti = true,
  hideBirthSummary = false,
  section,
}: KundaliViewProps) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const [janmaPhalaTab, setJanmaPhalaTab] = useState<"male" | "female">("male");

  const detailQ = useQuery({
    queryKey: kundaliDetailKeys.atTime(birthMoment, locationParams, ayanamshaMode),
    queryFn: () =>
      fetchKundaliDetail(birthMoment, locationParams, { ayanamsha: ayanamshaMode }),
    staleTime: 1000 * 60 * 5,
  });

  const detail: KundaliDetailResponse | undefined = detailQ.data;
  const isLoading = detailQ.isLoading;
  const isError = detailQ.isError;

  const data = useMemo(
    () => (detail?.panchanga ? normalizeEphemerisDay(detail.panchanga) : undefined),
    [detail],
  );

  const rawLagna = data ? getLagnaDisplay(data) : undefined;
  const lagna = useMemo(() => {
    if (!rawLagna) return undefined;
    const rashiNum = rawLagna.rashiNum ?? detail?.lagnaRashi ?? undefined;
    return { ...rawLagna, rashiNum };
  }, [rawLagna, detail?.lagnaRashi]);

  const d1Rows = useMemo(
    () => detail?.vargaCharts.entries["1"] ?? [],
    [detail],
  );
  const moonRow = useMemo(() => d1Rows.find((r) => r.key === "moon"), [d1Rows]);
  const sunRow = useMemo(() => d1Rows.find((r) => r.key === "sun"), [d1Rows]);

  const janmaPhalaPlanetBhavas = useMemo(() => {
    if (!detail?.vargaCharts) return {};
    const gulika = detail.upagrahas?.find((u) => u.key === "gulika");
    return d1AllJanmaPhalaBhavas(detail.vargaCharts, {
      gulikaLongitude: gulika?.longitude,
    });
  }, [detail]);

  const janmaNakshatra = useMemo(() => {
    const meta = detail?.birthMeta.moonNakshatra;
    const index = meta?.index ?? moonRow?.nakshatraIndex;
    const pada = meta?.pada ?? moonRow?.pada;
    if (index == null || pada == null) return undefined;
    return {
      index,
      pada,
      ne: NAKSHATRA_ICONS[index]?.ne ?? "—",
      en: NAKSHATRA_ICONS[index]?.en ?? "—",
    };
  }, [detail, moonRow]);

  const moonRashiLabel = useMemo(() => {
    if (!moonRow) return undefined;
    return bilingualText(
      lang,
      formatRashiByNumber(moonRow.vargaRashi, "ne"),
      formatRashiByNumber(moonRow.vargaRashi, "en"),
    );
  }, [moonRow, lang]);

  const pickBi = (v?: BilingualValue | null) => (v ? bilingualText(lang, v.ne, v.en) : "—");
  const janmaAvakahada = detail?.avakahada ?? null;

  const avakahadaShloka = useMemo(() => {
    if (!janmaAvakahada || !lagna?.nameNe || !moonRow) return undefined;
    return generateAvakahadaShloka({
      lagnaRashiNe: lagna.nameNe,
      moonRashiNe: formatRashiByNumber(moonRow.vargaRashi, "ne"),
      nakshatraNe: janmaAvakahada.nakshatra.ne,
      aksharaNe: janmaAvakahada.akshara.ne,
      ganaNe: janmaAvakahada.gana.ne,
      nadiNe: janmaAvakahada.nadi.ne,
      yoniNe: janmaAvakahada.yoni.ne,
      varnaNe: janmaAvakahada.jati.ne,
      vashyaNe: janmaAvakahada.vashya.ne,
      payaNe: janmaAvakahada.nakshatraPaya.ne,
    });
  }, [janmaAvakahada, lagna, moonRow]);

  const birthMeta = detail?.birthMeta;
  const ishtaKalaLabel = birthMeta?.ishtaKala
    ? formatGhadiPalaVipala(birthMeta.ishtaKala, lang)
    : undefined;
  const ahoratriIshtaLabel = birthMeta?.ahoratriIshtaKala
    ? formatGhadiPalaVipala(birthMeta.ahoratriIshtaKala, lang)
    : undefined;
  const choghadiyaAtBirth = birthMeta?.choghadiyaAtBirth ?? null;

  const astroPlanets = useMemo(() => (data ? astroPointsFromPanchanga(data) : {}), [data]);

  // 162-reference ids that are formed in this chart — hidden from the reference
  // catalog so a present yoga only shows in the "कुण्डली योग" table above it.
  const presentRefIds = useMemo(() => buildPresentYogaRefIds(detail?.yogas ?? []), [detail]);

  const astroLagna = useMemo<GrahaAstroPoint | undefined>(() => {
    if (lagna?.longitude == null) return undefined;
    const instant = data ? getInstantLagna(data) : undefined;
    return {
      longitude: lagna.longitude,
      latitude: instant?.latitude,
      rightAscension: instant?.right_ascension,
      declination: instant?.declination,
      speed: instant?.speed,
    };
  }, [lagna, data]);

  const panchangSummary = useMemo(() => {
    if (!data) return undefined;
    const pDetail = getPanchangaDetail(data);
    const tithiNe = formatTithiWithPaksha(data, "ne");
    const tithiEn = formatTithiWithPaksha(data, "en");
    const vaaraNe = getVaaraNe(data, data.weekday);
    const karanaNe =
      (pDetail?.karana as { name_ne?: string; name?: string } | undefined)?.name_ne ??
      data.karana?.name_ne ??
      (pDetail?.karana as { name?: string } | undefined)?.name ??
      data.karana?.name;
    const yogaIndex = detail?.birthMeta.yoga?.index;
    const yoga = yogaIndex != null ? { index: yogaIndex, ne: WHEEL_YOGAS[yogaIndex] ?? "—" } : undefined;
    return { tithiNe, tithiEn, vaaraNe, karanaNe, nakshatra: janmaNakshatra, yoga };
  }, [data, detail, janmaNakshatra]);

  const suryaMeta = useMemo(() => {
    if (!data) return undefined;
    const suryaRashi = getSuryaRashi(data);
    return {
      rashiNe: suryaRashi?.name_ne,
      rashiEn: suryaRashi?.name,
      nakshatra: sunRow
        ? {
            ne: NAKSHATRA_ICONS[sunRow.nakshatraIndex]?.ne ?? "—",
            en: NAKSHATRA_ICONS[sunRow.nakshatraIndex]?.en,
            pada: sunRow.pada,
          }
        : undefined,
    };
  }, [data, sunRow]);

  const vaaraEn = useMemo(() => {
    if (!data) return undefined;
    const pDetail = getPanchangaDetail(data);
    return (pDetail?.vaara as { name_english?: string } | undefined)?.name_english ?? data.weekday;
  }, [data]);

  const navamshaLagnaLabel = useMemo(() => {
    const d9 = detail?.vargaCharts?.entries?.["9"];
    const lagnaRow = d9?.find((row) => row.key === "lagna");
    if (!lagnaRow?.vargaRashi) return undefined;
    const ne = formatRashiByNumber(lagnaRow.vargaRashi, "ne");
    const en = formatRashiByNumber(lagnaRow.vargaRashi, "en");
    return { ne, en };
  }, [detail]);

  const aayanLabel = useMemo(() => {
    if (!data) return undefined;
    const pDetail = getPanchangaDetail(data);
    const aayan = pDetail?.aayan as { name_ne?: string; name?: string } | undefined;
    const topAayan = data.aayan;
    const ne =
      aayan?.name_ne ??
      (typeof topAayan === "object" && topAayan ? topAayan.name_ne : undefined);
    const en =
      aayan?.name ??
      (typeof topAayan === "object" && topAayan ? topAayan.name : undefined) ??
      ne;
    return ne ? { ne, en: en ?? ne } : undefined;
  }, [data]);

  const dasha = detail?.dasha ?? undefined;
  const tribhagiDasha = detail?.tribhagiDasha ?? undefined;
  const yoginiDasha = detail?.yoginiDasha ?? undefined;
  const ayanamshaInfo = getAyanamshaModeInfo(ayanamshaMode);
  const effectiveTimezone = resolveTimeZone(data?.location?.timezone, locationParams?.timezone);
  const locationLabel = data?.location?.name ?? locationLabelProp;

  const navigate = useNavigate();
  const showSection = (id: KundaliContentSectionId) =>
    section == null || contentSectionId(section) === id;
  const goSection = (id: KundaliSectionId) => {
    navigate({ to: ".", hash: id, replace: true });
  };
  const dashaSystem = section ? (dashaSystemFromSection(section) ?? "vimshottari") : "vimshottari";

  const birthBsLabel = useMemo(
    () => formatMomentDateLabel(birthMoment, lang, digits),
    [birthMoment, lang, digits],
  );

  if (isError) {
    return (
      <div className={cn(kundaliClasses.loadError, kundaliClasses.loadErrorText)}>
        {t("kundali.load_error")}
      </div>
    );
  }

  if (!detail || !data) {
    return (
      <div className={cn(kundaliClasses.computingBox, kundaliClasses.emptyText)}>
        <Clock className="mx-auto mb-3 h-8 w-8 animate-pulse" />
        {t("kundali.computing")}
      </div>
    );
  }

  return (
    <div className={section ? undefined : "space-y-6"}>
      {/* Birth summary — anonymous / generator flow only */}
      {!hideBirthSummary && (
        <section className="rounded-2xl overflow-hidden bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:divide-x lg:divide-border">
          <div className={cn(kundaliDetailClasses.view.birthCell, "lg:border-b-0")}>
            <p className={kundaliDetailClasses.view.birthLabel}>
              {t("kundali.birth_moment")}
            </p>
            <p className={cn(kundaliDetailClasses.view.birthDate, "font-[family-name:var(--pn-num)]")}>
              {birthBsLabel}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={cn(kundaliDetailClasses.view.infoChip, "inline-flex")}>
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {locationLabel}
                {effectiveTimezone ? ` · ${effectiveTimezone}` : ""}
              </span>
              <span className={cn(kundaliDetailClasses.view.infoChip, "inline-flex font-mono font-semibold text-foreground")}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {digits(birthMoment.clock)}
              </span>
            </div>
          </div>

          {lagna && (
            <div className={cn(kundaliDetailClasses.view.lagnaCell, "flex flex-col justify-center min-w-[200px]")}>
              <div className={kundaliDetailClasses.view.lagnaHead}>
                <p className="text-sm font-semibold uppercase tracking-wider">
                  {t("kundali.lagna")}
                </p>
                <span className={kundaliDetailClasses.view.lagnaBadge}>
                  {ayanamshaInfo.labelNe}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {lagna.nameNe}
                {lagna.degree && (
                  <span className="text-base font-normal ml-2 font-mono">
                    {lagna.degree}°
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Unified birth panchanga + avakahada (profile view) */}
      {showSection("kundali-overview") && hideBirthSummary && (panchangSummary || lagna) && (
        <div className={cn(kundaliDetailClasses.birth.card, "bg-gradient-to-br from-secondary/[0.08] to-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_15%,transparent)]")}>
          <div className={cn(kundaliDetailClasses.birth.head, "flex")}>
            <p className={kundaliDetailClasses.birth.title}>
              {t("kundali.birth_panchanga")}
            </p>
            <span className={cn(kundaliDetailClasses.birth.chip, kundaliDetailClasses.birth.chipText)}>
              {ayanamshaInfo.labelNe}
            </span>
          </div>

          <div className={cn(kundaliDetailClasses.birth.traits, "flex")}>
            {panchangSummary?.tithiNe ? (
              <DetailTraitRow
                label={t("kundali.tithi")}
                value={bilingualText(lang, panchangSummary.tithiNe, panchangSummary.tithiEn ?? panchangSummary.tithiNe)}
              />
            ) : null}
            {panchangSummary?.nakshatra ? (
              <DetailTraitRow
                label={t("kundali.nakshatra")}
                value={`${bilingualText(lang, panchangSummary.nakshatra.ne, panchangSummary.nakshatra.en)} · ${tFor(lang, "ui.kundali.pada_pada", { pada: digits(panchangSummary.nakshatra.pada) })}`}
              />
            ) : null}
            {panchangSummary?.yoga ? (
              <DetailTraitRow label={t("kundali.yoga")} value={panchangSummary.yoga.ne} />
            ) : null}
            {panchangSummary?.karanaNe ? (
              <DetailTraitRow label={t("kundali.karana")} value={panchangSummary.karanaNe} />
            ) : null}
            {choghadiyaAtBirth ? (
              <DetailTraitRow
                label={t("kundali.choghadiya")}
                value={bilingualText(lang, `${choghadiyaAtBirth.nameNe} (${choghadiyaAtBirth.quality})`, `${choghadiyaAtBirth.nameEn ?? choghadiyaAtBirth.nameNe} (${
                    choghadiyaAtBirth.quality === "शुभ"
                      ? "auspicious"
                      : choghadiyaAtBirth.quality === "अशुभ"
                        ? "inauspicious"
                        : "neutral"
                  })`)}
              />
            ) : null}
            {lagna ? (
              <DetailTraitRow
                label={t("kundali.lagna")}
                value={`${lagna.nameNe}${lagna.degree ? ` ${lagna.degree}°` : ""}`}
              />
            ) : null}
            {navamshaLagnaLabel ? (
              <DetailTraitRow
                label={t("kundali.navamsha_lagna")}
                value={bilingualText(lang, navamshaLagnaLabel.ne, navamshaLagnaLabel.en)}
              />
            ) : null}
            {moonRashiLabel ? (
              <DetailTraitRow label={t("kundali.rashi_moon")} value={moonRashiLabel} />
            ) : null}
            {getSunriseDisplay(data) ? (
              <DetailTraitRow
                label={t("kundali.sunrise")}
                value={getSunriseDisplay(data) ?? "—"}
              />
            ) : null}
            {getSunsetDisplay(data) ? (
              <DetailTraitRow
                label={t("kundali.sunset")}
                value={getSunsetDisplay(data) ?? "—"}
              />
            ) : null}
            <DetailTraitRow label={t("kundali.ishta_kala")} value={ishtaKalaLabel ?? "—"} />
            <DetailTraitRow
              label={t("kundali.ahoratri_ishta_kala")}
              value={ahoratriIshtaLabel ?? "—"}
            />
            {panchangSummary?.vaaraNe ? (
              <DetailTraitRow
                label={t("kundali.weekday")}
                value={bilingualText(lang, panchangSummary.vaaraNe, vaaraEn ?? panchangSummary.vaaraNe)}
              />
            ) : null}
            {aayanLabel ? (
              <DetailTraitRow
                label={t("kundali.ayana")}
                value={bilingualText(lang, aayanLabel.ne, aayanLabel.en)}
              />
            ) : null}
            {suryaMeta?.rashiNe ? (
              <DetailTraitRow
                label={t("kundali.sun_sign")}
                value={bilingualText(lang, suryaMeta.rashiNe, suryaMeta.rashiEn ?? suryaMeta.rashiNe)}
              />
            ) : null}
            {suryaMeta?.nakshatra ? (
              <DetailTraitRow
                label={t("kundali.surya_nakshatra")}
                value={bilingualText(lang, `${suryaMeta.nakshatra.ne} · पद ${digits(suryaMeta.nakshatra.pada)}`, `${suryaMeta.nakshatra.en ?? suryaMeta.nakshatra.ne} · Pada ${digits(suryaMeta.nakshatra.pada)}`)}
              />
            ) : null}
          </div>

          {janmaAvakahada ? (
            <div className={kundaliDetailClasses.birth.avakahada}>
              <p className={kundaliDetailClasses.birth.avakahadaTitle}>
                {t("kundali.avakahada")}
                <span className={cn(kundaliDetailClasses.birth.avakahadaDot, "mx-1.5")}>·</span>
                <span className={kundaliDetailClasses.birth.avakahadaName}>
                  {pickBi(janmaAvakahada.nakshatra)}
                  <span className="mx-1">·</span>
                  {tFor(lang, "ui.kundali.pada_pada", { pada: digits(janmaAvakahada.pada) })}
                </span>
              </p>
              <div className={cn(kundaliDetailClasses.birth.traits, "flex")}>
                <DetailTraitRow
                  label={t("kundali.rashi_paya")}
                  value={pickBi(janmaAvakahada.rashiPaya)}
                />
                <DetailTraitRow
                  label={t("kundali.nakshatra_paya")}
                  value={pickBi(janmaAvakahada.nakshatraPaya)}
                />
                <DetailTraitRow label={t("kundali.tattva")} value={pickBi(janmaAvakahada.tattva)} />
                <DetailTraitRow label={t("kundali.yunja")} value={pickBi(janmaAvakahada.yunja)} />
                <DetailTraitRow label={t("kundali.vashya")} value={pickBi(janmaAvakahada.vashya)} />
                <DetailTraitRow label={t("kundali.tara")} value={pickBi(janmaAvakahada.tara)} />
                <DetailTraitRow label={t("kundali.akshara")} value={pickBi(janmaAvakahada.akshara)} />
                <DetailTraitRow label={t("kundali.gana")} value={pickBi(janmaAvakahada.gana)} />
                <DetailTraitRow label={t("kundali.nadi")} value={pickBi(janmaAvakahada.nadi)} />
                <DetailTraitRow label={t("kundali.asana")} value={pickBi(janmaAvakahada.asana)} />
                <DetailTraitRow label={t("kundali.yoni")} value={pickBi(janmaAvakahada.yoni)} />
                <DetailTraitRow label={t("kundali.jati")} value={pickBi(janmaAvakahada.jati)} />
              </div>
              {avakahadaShloka ? (
                <div className={kundaliDetailClasses.birth.shlokaBox}>
                  <p className={kundaliDetailClasses.birth.shlokaLabel}>
                    {t("kundali.avakahada_shloka")}
                  </p>
                  <p className={cn(kundaliDetailClasses.birth.shlokaText, "whitespace-pre-line")}>
                    {avakahadaShloka}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {panchangSummary && !hideBirthSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatTile label={t("kundali.rashi_moon")} value={moonRashiLabel ?? "—"} />
          <StatTile
            label={t("kundali.nakshatra_moon")}
            value={panchangSummary.nakshatra ? bilingualText(lang, panchangSummary.nakshatra.ne, panchangSummary.nakshatra.en) : "—"}
            sub={panchangSummary.nakshatra ? tFor(lang, "ui.kundali.pada_pada", { pada: digits(panchangSummary.nakshatra.pada) }) : undefined}
          />
          <StatTile
            label={t("kundali.tithi")}
            value={bilingualText(lang, panchangSummary.tithiNe ?? "—", panchangSummary.tithiEn ?? panchangSummary.tithiNe ?? "—")}
          />
          <StatTile label={t("kundali.day")} value={panchangSummary.vaaraNe ?? "—"} />
          <StatTile label={t("kundali.yoga")} value={panchangSummary.yoga?.ne ?? "—"} />
        </div>
      )}


      {showSection("kundali-overview") && d1Rows.length > 0 && (
        <div id="kundali-charts" className="scroll-mt-24">
          <PanchangaSection titleNe="कुण्डली चक्र" titleEn="Divisional Charts">
            <DivisionalChartCompare
              vargaCharts={detail.vargaCharts}
              combustion={detail.combustion}
            />
          </PanchangaSection>
        </div>
      )}

      {/* Graha details — astronomical readout for the birth instant (D1), with upagraha (shadow points) as a separate table in the same section */}
      {showSection("kundali-graha") && d1Rows.length > 0 && (
        <div id="kundali-graha" className="scroll-mt-24">
          <PanchangaSection titleNe="ग्रह विवरण" titleEn="Graha Details">
            <Suspense fallback={<SectionLoading />}>
              <GrahaAstroTable
                planets={astroPlanets}
                lagna={astroLagna}
                d1Rows={d1Rows}
                combustion={detail.combustion}
              />
              {detail.upagrahas.length > 0 && (
                <div className="border-t border-border">
                  <p className={kundaliDetailClasses.view.upagrahaTitle}>
                    {t("kundali.upagraha")}
                  </p>
                  <UpagrahaTable upagrahas={detail.upagrahas} />
                </div>
              )}
            </Suspense>
          </PanchangaSection>
        </div>
      )}

      {/* Kundali yogas — those formed in this chart; the reference catalog below
          lists the rest of Raman's 162 (the absent ones), with present ones removed
          so no combination appears twice. */}
      {showSection("kundali-yoga") && (
        <div id="kundali-yoga" className="scroll-mt-24 space-y-6">
          <PanchangaSection titleNe="कुण्डली योग" titleEn="Kundali Yoga">
            <Suspense fallback={<SectionLoading />}>
              {detail.yogas.some((y) => y.present) && <YogaList yogas={detail.yogas} />}
              <div className="px-3.5 pb-3.5">
                <YogaReferenceCatalog excludeIds={presentRefIds} />
              </div>
            </Suspense>
          </PanchangaSection>
          <KundaliYogaSources />
        </div>
      )}

      {showSection("kundali-dasha") && (dasha || tribhagiDasha || yoginiDasha) && (
        <div id="kundali-dasha" className="scroll-mt-24 space-y-6">
        <PanchangaSection titleNe="दशा" titleEn="Dasha">
          <div className="p-4">
            <Suspense fallback={<SectionLoading />}>
              <DashaSystemPanel
                vimshottari={dasha}
                tribhagi={tribhagiDasha}
                yogini={yoginiDasha}
                timeZone={effectiveTimezone}
                active={dashaSystem}
                onActiveChange={(system) => goSection(dashaSectionId(system))}
              />
            </Suspense>
          </div>
        </PanchangaSection>
        <DashaSources />
        </div>
      )}

      {showSection("kundali-shadbala") && (
        <div id="kundali-shadbala" className="scroll-mt-24 space-y-6">
          <div className={cn(kundaliDetailClasses.sectionCard.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
            <Suspense fallback={<SectionLoading />}>
              <KundaliSubTabs
                items={BALA_TAB_SECTIONS}
                activeId="kundali-shadbala"
                onSelect={goSection}
                ariaLabel={t("kundali.nav_bala")}
              />
              <ShadbalaCard
                data={detail.shadbala}
                yuddha={detail.yuddha}
                bhavaBala={detail.bhavaBala}
              />
            </Suspense>
          </div>
          <ShadbalaSources />
        </div>
      )}

      {showSection("kundali-bhava-bala") && (
        <div id="kundali-bhava-bala" className="scroll-mt-24 space-y-6">
          <div className={cn(kundaliDetailClasses.sectionCard.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
            <Suspense fallback={<SectionLoading />}>
              <KundaliSubTabs
                items={BALA_TAB_SECTIONS}
                activeId="kundali-bhava-bala"
                onSelect={goSection}
                ariaLabel={t("kundali.nav_bala")}
              />
              {detail.bhavaBala ? (
                <BhavaBalaCard
                  data={detail.bhavaBala}
                  vargaCharts={detail.vargaCharts}
                  combustion={detail.combustion}
                />
              ) : (
                <p className={kundaliClasses.sectionUnavailable}>
                  {t("kundali.section_unavailable")}
                </p>
              )}
              <JanmaPhalaTables
                tab={janmaPhalaTab}
                onTabChange={setJanmaPhalaTab}
                chartBhavas={janmaPhalaPlanetBhavas}
              />
            </Suspense>
          </div>
          <BhavaBalaSources />
        </div>
      )}

      {showSection("kundali-ashtakavarga") && (
        <div id="kundali-ashtakavarga" className="scroll-mt-24 space-y-6">
          <div className={cn(kundaliDetailClasses.sectionCard.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
            <Suspense fallback={<SectionLoading />}>
              <KundaliSubTabs
                items={BALA_TAB_SECTIONS}
                activeId="kundali-ashtakavarga"
                onSelect={goSection}
                ariaLabel={t("kundali.nav_bala")}
              />
              {detail.ashtakavarga ? (
                <AshtakavargaCard data={detail.ashtakavarga} />
              ) : (
                <p className={kundaliClasses.sectionUnavailable}>
                  {t("kundali.section_unavailable")}
                </p>
              )}
            </Suspense>
          </div>
          <AshtakavargaSources />
        </div>
      )}

      {showSection("kundali-vimshopaka") && (
        <div id="kundali-vimshopaka" className="scroll-mt-24 space-y-6">
          <div className={cn(kundaliDetailClasses.sectionCard.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
            <Suspense fallback={<SectionLoading />}>
              <KundaliSubTabs
                items={BALA_TAB_SECTIONS}
                activeId="kundali-vimshopaka"
                onSelect={goSection}
                ariaLabel={t("kundali.nav_bala")}
              />
              {detail.vimshopaka && detail.vimshopaka.classifications.length > 0 ? (
                <VimshopakaCard data={detail.vimshopaka} />
              ) : (
                <p className={kundaliClasses.sectionUnavailable}>
                  {t("kundali.section_unavailable")}
                </p>
              )}
            </Suspense>
          </div>
          <VimshopakaSources />
        </div>
      )}

      {showSection("kundali-shanti") && showShanti && (
        <div id="kundali-shanti" className="scroll-mt-24 space-y-6">
        <PanchangaSection titleNe="शान्ति विधि" titleEn="Navagraha Shanti">
          <div className="p-4">
            <div className={kundaliDetailClasses.view.shantiNote}>
              <Flame className="h-4 w-4 text-secondary" />
              {t("kundali.navagraha_shanti_suggested_from_this_chart_s_dasha_and_")}
            </div>
            <Suspense fallback={<SectionLoading />}>
              <ShantiVidhiPanel
                grahaShanti={detail.grahaShanti}
                isError={isError}
              />
            </Suspense>
          </div>
        </PanchangaSection>
        <ShantiSources />
        </div>
      )}

      {showSection("kundali-report") && (
      <div id="kundali-report" className="scroll-mt-24">
      <Suspense fallback={<SectionLoading />}>
        <KundaliReport
          key={`${instantCacheKey(birthMoment)}|${locationCacheKey(locationParams)}|${ayanamshaMode}`}
          moment={birthMoment}
          location={locationParams}
          ayanamsha={ayanamshaMode}
          disabled={isLoading || isError}
        />
      </Suspense>
      </div>
      )}
    </div>
  );
}

function KundaliYogaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        <li className={kundaliDetailClasses.sources.row}>
          <span className={kundaliDetailClasses.sources.index}>{digits(1)}.</span>
          <div className={kundaliDetailClasses.sources.body}>
            <p className={kundaliDetailClasses.prose.strong}>{t("kundali.sources.bphs.credit")}</p>
            <p className={kundaliDetailClasses.sources.line}>{t("kundali.sources.bphs.edition")}</p>
            <p className={kundaliDetailClasses.sources.line}>{t("kundali.sources.bphs.used")}</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

const SHANTI_SOURCE_IDS = [
  "yajnavalkya",
  "bphs",
  "puranas",
  "phaladeepika",
  "muhurtachintamani",
  "uttarakalamrita",
  "lalkitab",
] as const;

function ShantiSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {SHANTI_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.shanti.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.shanti.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.shanti.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const DASHA_SOURCE_IDS = ["vimshottari", "tribhagi", "yogini"] as const;

function DashaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {DASHA_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.dasha.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.dasha.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.dasha.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const SHADBALA_SOURCE_IDS = ["bphs", "saravali", "jatakparijat"] as const;

function ShadbalaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {SHADBALA_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.shadbala.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.shadbala.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.shadbala.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const BHAVA_BALA_SOURCE_IDS = [
  "phaladeepika",
  "brihatjataka",
  "horasara",
  "sripatipaddhati",
  "jatakparijat",
] as const;

function BhavaBalaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {BHAVA_BALA_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.bhavabala.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.bhavabala.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.bhavabala.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ASHTAKAVARGA_SOURCE_IDS = ["bphs", "jatakparijat"] as const;

function AshtakavargaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {ASHTAKAVARGA_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.ashtakavarga.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.ashtakavarga.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.ashtakavarga.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const VIMSHOPAKA_SOURCE_IDS = ["bphs", "jatakparijat"] as const;

function VimshopakaSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className={kundaliDetailClasses.sources.card}>
      <h2 className={kundaliDetailClasses.prose.heading}>{t("kundali.sources.heading")}</h2>
      <p className={kundaliDetailClasses.prose.mutedMt15}>{t("kundali.sources.blurb")}</p>
      <ol className={kundaliDetailClasses.sources.list}>
        {VIMSHOPAKA_SOURCE_IDS.map((id, i) => (
          <li key={id} className={kundaliDetailClasses.sources.row}>
            <span className={kundaliDetailClasses.sources.index}>{digits(i + 1)}.</span>
            <div className={kundaliDetailClasses.sources.body}>
              <p className={kundaliDetailClasses.prose.strong}>{t(`kundali.sources.vimshopaka.${id}.credit`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.vimshopaka.${id}.edition`)}</p>
              <p className={kundaliDetailClasses.sources.line}>{t(`kundali.sources.vimshopaka.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default KundaliView;
