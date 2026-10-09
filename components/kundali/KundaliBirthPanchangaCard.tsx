import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { BilingualValue, KundaliDetailResponse } from "@/lib/api";
import { getAyanamshaModeInfo, type AyanamshaMode } from "@/lib/ayanamsha";
import { formatGhadiPalaVipala } from "@/lib/birth-panchanga-meta";
import { normalizeEphemerisDay } from "@/lib/ephemeris-adapters";
import {
  formatChoghadiyaAtBirth,
  kundaliLabel,
  type KundaliI18nKey,
} from "@/lib/kundali/kundali-i18n";
import { generateAvakahadaShloka } from "@/lib/avakahada-data";
import { useLocale } from "@/lib/i18n";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  formatTithiWithPaksha,
  formatAayanLabel,
  getAayanVedic,
  getLagnaDisplay,
  getPanchangaDetail,
  getSunriseDisplay,
  getSunsetDisplay,
  getSuryaRashi,
  getVaaraEn,
  getVaaraNe,
} from "@/lib/panchanga-format.web";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { WHEEL_YOGAS } from "@/lib/tithi-wheel-data";
import { useThemeColors } from "@/lib/theme-context";

function TraitRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[9rem] flex-row flex-wrap items-baseline gap-1">
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className="text-body text-muted-foreground">:</Text>
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(13)}>
        {value}
      </Text>
    </View>
  );
}

function pickBi(lang: "ne" | "en", v?: BilingualValue | null): string {
  if (!v) return "—";
  return lang === "en" ? v.en || v.ne : v.ne || v.en;
}

type Props = {
  detail: KundaliDetailResponse;
  ayanamshaMode: AyanamshaMode;
};

export function KundaliBirthPanchangaCard({ detail, ayanamshaMode }: Props) {
  const { lang, digits, pick } = useLocale();
  const colors = useThemeColors();
  const t = (key: KundaliI18nKey) => kundaliLabel(key, lang);
  const ayanamshaInfo = getAyanamshaModeInfo(ayanamshaMode);
  const data = normalizeEphemerisDay(detail.panchanga);
  const pDetail = getPanchangaDetail(data);
  const d1Rows = detail.vargaCharts.entries["1"] ?? [];
  const moonRow = d1Rows.find((r) => r.key === "moon");
  const sunRow = d1Rows.find((r) => r.key === "sun");
  const d9Lagna = detail.vargaCharts.entries["9"]?.find((r) => r.key === "lagna");

  const meta = detail.birthMeta;
  const choghadiya = meta.choghadiyaAtBirth;
  const avakahada = detail.avakahada;

  const tithiNe = formatTithiWithPaksha(data, "ne");
  const tithiEn = formatTithiWithPaksha(data, "en");

  const janmaNakshatra = useMemo(() => {
    const index = meta.moonNakshatra?.index ?? moonRow?.nakshatraIndex;
    const pada = meta.moonNakshatra?.pada ?? moonRow?.pada;
    if (index == null || pada == null) return undefined;
    return {
      ne: NAKSHATRA_ICONS[index]?.ne ?? "—",
      en: NAKSHATRA_ICONS[index]?.en ?? "—",
      pada,
    };
  }, [meta.moonNakshatra, moonRow]);

  const yogaLabel = useMemo(() => {
    const idx = meta.yoga?.index;
    return idx != null ? WHEEL_YOGAS[idx] : undefined;
  }, [meta.yoga?.index]);

  const karanaNe =
    (pDetail?.karana as { name_ne?: string } | undefined)?.name_ne ?? data.karana?.name_ne;
  const karanaEn =
    (pDetail?.karana as { name?: string } | undefined)?.name ?? data.karana?.name;

  const lagnaDisplay = getLagnaDisplay(data);
  const lagnaValue = useMemo(() => {
    if (!lagnaDisplay) return undefined;
    const name =
      lang === "en" && lagnaDisplay.rashiNum
        ? formatRashiByNumber(lagnaDisplay.rashiNum, "en")
        : lagnaDisplay.nameNe;
    const deg =
      lagnaDisplay.degreeInRashi != null
        ? digits(lagnaDisplay.degreeInRashi.toFixed(1))
        : lagnaDisplay.degree;
    return deg ? `${name} ${deg}°` : name;
  }, [lagnaDisplay, lang, digits]);

  const avakahadaShloka = useMemo(() => {
    /* Lagna name: the instant-lagna display first, else the chart's own lagna
       rashi — so the shloka never silently disappears on a payload shape the
       display helper cannot read. */
    const lagnaRashiNe =
      lagnaDisplay?.nameNe ||
      (detail.lagnaRashi != null ? formatRashiByNumber(detail.lagnaRashi, "ne") : undefined);
    const moonRashi = moonRow?.vargaRashi;
    if (!avakahada || !lagnaRashiNe || lagnaRashiNe === "—" || moonRashi == null) return undefined;
    return generateAvakahadaShloka({
      lagnaRashiNe,
      moonRashiNe: formatRashiByNumber(moonRashi, "ne"),
      nakshatraNe: avakahada.nakshatra.ne,
      aksharaNe: avakahada.akshara.ne,
      ganaNe: avakahada.gana.ne,
      nadiNe: avakahada.nadi.ne,
      yoniNe: avakahada.yoni.ne,
      varnaNe: avakahada.jati.ne,
      vashyaNe: avakahada.vashya.ne,
      payaNe: avakahada.nakshatraPaya.ne,
    });
  }, [avakahada, lagnaDisplay, moonRow, detail.lagnaRashi]);

  const vaaraNe = getVaaraNe(data, data.weekday);
  const vaaraEn = getVaaraEn(data, data.weekday);

  const ayanaValue = formatAayanLabel(getAayanVedic(data), lang);

  const suryaRashi = getSuryaRashi(data);
  const suryaRashiValue = useMemo(() => {
    if (suryaRashi?.name_ne || suryaRashi?.name) {
      return lang === "en"
        ? suryaRashi.name ?? suryaRashi.name_ne ?? "—"
        : suryaRashi.name_ne ?? suryaRashi.name ?? "—";
    }
    if (sunRow?.vargaRashi) return formatRashiByNumber(sunRow.vargaRashi, lang);
    return undefined;
  }, [suryaRashi, sunRow, lang]);

  const suryaNakshatraValue = useMemo(() => {
    if (!sunRow || sunRow.nakshatraIndex == null || sunRow.pada == null) return undefined;
    const ne = NAKSHATRA_ICONS[sunRow.nakshatraIndex]?.ne ?? "—";
    const en = NAKSHATRA_ICONS[sunRow.nakshatraIndex]?.en ?? ne;
    const name = lang === "en" ? en : ne;
    return `${name} · ${kundaliLabel("pada", lang)} ${digits(sunRow.pada)}`;
  }, [sunRow, lang, digits]);

  return (
    <View
      style={{ borderColor: `${colors.secondary}40` }}
      className="mb-4 rounded-2xl border bg-card p-4 sm:p-5"
    >
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <Text
          className="text-caption font-semibold uppercase tracking-wider text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {t("birth_panchanga")}
        </Text>
        <View className="rounded-full border border-border bg-card px-2.5 py-1">
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
            {lang === "en" ? ayanamshaInfo.label : ayanamshaInfo.labelNe}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {tithiNe ? (
          <TraitRow
            label={t("tithi")}
            value={lang === "en" ? tithiEn ?? tithiNe : tithiNe}
          />
        ) : null}
        {janmaNakshatra ? (
          <TraitRow
            label={t("nakshatra")}
            value={`${lang === "en" ? janmaNakshatra.en : janmaNakshatra.ne} · ${t("pada")} ${digits(janmaNakshatra.pada)}`}
          />
        ) : null}
        {yogaLabel ? <TraitRow label={t("yoga")} value={yogaLabel} /> : null}
        {karanaNe ? (
          <TraitRow
            label={t("karana")}
            value={lang === "en" ? karanaEn ?? karanaNe : karanaNe}
          />
        ) : null}
        {choghadiya ? (
          <TraitRow label={t("choghadiya")} value={formatChoghadiyaAtBirth(lang, choghadiya)} />
        ) : null}
        {lagnaValue ? <TraitRow label={t("lagna")} value={lagnaValue} /> : null}
        {d9Lagna?.vargaRashi ? (
          <TraitRow
            label={t("navamsha_lagna")}
            value={formatRashiByNumber(d9Lagna.vargaRashi, lang)}
          />
        ) : null}
        {moonRow ? (
          <TraitRow
            label={t("rashi_moon")}
            value={formatRashiByNumber(moonRow.vargaRashi, lang)}
          />
        ) : null}
        {getSunriseDisplay(data) ? (
          <TraitRow label={t("sunrise")} value={getSunriseDisplay(data)!} />
        ) : null}
        {getSunsetDisplay(data) ? (
          <TraitRow label={t("sunset")} value={getSunsetDisplay(data)!} />
        ) : null}
        <TraitRow
          label={t("ishta_kala")}
          value={meta.ishtaKala ? formatGhadiPalaVipala(meta.ishtaKala, lang) : "—"}
        />
        <TraitRow
          label={t("ahoratri_ishta_kala")}
          value={meta.ahoratriIshtaKala ? formatGhadiPalaVipala(meta.ahoratriIshtaKala, lang) : "—"}
        />
        {vaaraNe ? (
          <TraitRow
            label={t("weekday")}
            value={lang === "en" ? vaaraEn ?? vaaraNe : vaaraNe}
          />
        ) : null}
        {ayanaValue ? <TraitRow label={t("ayana")} value={ayanaValue} /> : null}
        {suryaRashiValue ? (
          <TraitRow label={t("sun_sign")} value={suryaRashiValue} />
        ) : null}
        {suryaNakshatraValue ? (
          <TraitRow label={t("surya_nakshatra")} value={suryaNakshatraValue} />
        ) : null}
      </View>

      {avakahada ? (
        <View className="mt-4 border-t border-border/70 pt-4">
          <Text className="text-body mb-2" style={nepaliTextStyle(14)}>
            <Text
              className="text-caption font-semibold uppercase tracking-wider text-muted-foreground"
              style={nepaliTextStyle(12)}
            >
              {t("avakahada")}
            </Text>
            <Text className="text-muted-foreground"> · </Text>
            <Text className="font-semibold text-foreground">{pickBi(lang, avakahada.nakshatra)}</Text>
            <Text className="text-muted-foreground"> · </Text>
            <Text className="font-semibold text-foreground">
              {t("pada")} {digits(avakahada.pada)}
            </Text>
          </Text>
          <View className="flex-row flex-wrap gap-x-4 gap-y-2">
            <TraitRow label={t("rashi_paya")} value={pickBi(lang, avakahada.rashiPaya)} />
            <TraitRow label={t("nakshatra_paya")} value={pickBi(lang, avakahada.nakshatraPaya)} />
            <TraitRow label={t("tattva")} value={pickBi(lang, avakahada.tattva)} />
            <TraitRow label={t("yunja")} value={pickBi(lang, avakahada.yunja)} />
            <TraitRow label={t("vashya")} value={pickBi(lang, avakahada.vashya)} />
            <TraitRow label={t("tara")} value={pickBi(lang, avakahada.tara)} />
            <TraitRow label={t("akshara")} value={pickBi(lang, avakahada.akshara)} />
            <TraitRow label={t("gana")} value={pickBi(lang, avakahada.gana)} />
            <TraitRow label={t("nadi")} value={pickBi(lang, avakahada.nadi)} />
            <TraitRow label={t("asana")} value={pickBi(lang, avakahada.asana)} />
            <TraitRow label={t("yoni")} value={pickBi(lang, avakahada.yoni)} />
            <TraitRow label={t("jati")} value={pickBi(lang, avakahada.jati)} />
          </View>
          {avakahadaShloka ? (
            <View className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
              <Text
                className="text-caption mb-1 uppercase tracking-wide text-muted-foreground"
                style={nepaliTextStyle(12)}
              >
                {pick("अवकहडा श्लोक", "Avakahada Shloka")}
              </Text>
              <Text className="text-body italic leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
                {avakahadaShloka}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
