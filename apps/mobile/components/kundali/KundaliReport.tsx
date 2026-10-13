import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { KundaliSection } from "@/components/kundali/KundaliSections";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import {
  streamKundaliReport,
  type LocationParams,
  type ReportConfidence,
  type ReportItem,
  type ReportMeta,
  type ReportSection,
} from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import {
  bilingualKundali,
  kundaliLabel,
  kundaliLabelVars,
  type KundaliI18nKey,
} from "@/lib/kundali/kundali-i18n";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { localizeItemLabel } from "@vedic-patro/domain/kundali/report-labels";

import { illustration } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
type Status = "idle" | "streaming" | "done" | "error";

const CONFIDENCE_KEYS: Record<ReportConfidence, KundaliI18nKey> = {
  strong: "report_confidence_strong",
  moderate: "report_confidence_moderate",
  mixed: "report_confidence_mixed",
  tentative: "report_confidence_tentative",
};

const r = kundaliDetailClasses.report;

const CONFIDENCE_TONE: Record<ReportConfidence, { box: string; text?: string }> = {
  strong: { box: r.strongBox, text: r.strongText },
  moderate: { box: r.moderateBox, text: r.moderateText },
  mixed: { box: r.mixedBox, text: r.mixedText },
  tentative: { box: r.tentativeBox },
};

function ConfidenceBadge({ level }: { level: ReportConfidence }) {
  const { lang } = useLocale();
  return (
    <View className={cn(r.badge, CONFIDENCE_TONE[level].box)}>
      <Text className={cn(r.badgeText, CONFIDENCE_TONE[level].text)} style={nepaliTextStyle(11)}>
        {kundaliLabel(CONFIDENCE_KEYS[level], lang)}
      </Text>
    </View>
  );
}

function FactorList({ factors }: { factors?: string[] }) {
  const { lang } = useLocale();
  const [open, setOpen] = useState(false);
  if (!factors?.length) return null;
  return (
    <View className={r.factorWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} className={cn(r.factorToggle, "active:opacity-70")}>
        <Ionicons name="information-circle-outline" size={14} color={illustration.gray53} />
        <Text className={r.factorToggleText} style={nepaliTextStyle(12)}>
          {kundaliLabelVars("report_factors_based", lang, { count: factors.length })}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={illustration.gray53}
        />
      </Pressable>
      {open ? (
        <View className={r.factorList}>
          {factors.map((f, i) => (
            <Text key={i} className={r.factorItem} style={nepaliTextStyle(12)}>
              {f}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ItemCard({ item }: { item: ReportItem }) {
  const { lang } = useLocale();
  const isEnglish = lang === "en";
  return (
    <View className={r.itemCard}>
      <View className={r.itemHead}>
        <Text className={cn(r.itemLabel, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
          {localizeItemLabel(item.label, isEnglish)}
        </Text>
        <ConfidenceBadge level={item.confidence} />
      </View>
      <Text className={r.itemText} style={nepaliTextStyle(14)}>
        {item.text}
      </Text>
      <FactorList factors={item.factors} />
    </View>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const { lang } = useLocale();
  const { width } = useBreakpoint();
  const isEnglish = lang === "en";
  const title = bilingualKundali(lang, section.title_ne, section.title_en);
  const itemCols =
    width >= BREAKPOINTS.md &&
    (section.id === "planet_by_planet" ||
      section.id === "house_by_house" ||
      section.id === "divisional_charts")
      ? 2
      : 1;

  return (
    <Card className={cn(r.sectionCard, section.optional ? "border-dashed" : undefined)}>
      <View className={r.sectionHead}>
        <Text className={r.sectionTitle} style={nepaliTextStyle(16)}>
          {title}
        </Text>
        {isEnglish ? (
          <Text className={r.sectionTitleEn} style={nepaliTextStyle(11)}>
            {section.title_en}
          </Text>
        ) : null}
        {section.confidence ? (
          <View className="ml-auto">
            <ConfidenceBadge level={section.confidence} />
          </View>
        ) : null}
      </View>

      {section.body.length > 0 ? (
        <View className={r.sectionBody}>
          {section.body.map((p, i) => (
            <Text key={i} className={r.sectionParagraph} style={nepaliTextStyle(14)}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}

      {section.confidence ? <FactorList factors={section.factors} /> : null}

      {section.items && section.items.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2.5">
          {section.items.map((it, i) => (
            <View
              key={i}
              style={{ width: itemCols === 2 ? "48%" : "100%" }}
            >
              <ItemCard item={it} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function MetaStrip({ meta }: { meta: ReportMeta }) {
  const { lang } = useLocale();
  const isEnglish = lang === "en";

  const cells: { label: string; value: string; sub?: string }[] = [
    {
      label: kundaliLabel("report_meta_lagna", lang),
      value: bilingualKundali(lang, meta.lagna.name_ne, meta.lagna.name_en),
    },
    {
      label: kundaliLabel("report_meta_nakshatra", lang),
      value: meta.nakshatra
        ? bilingualKundali(lang, meta.nakshatra.name_ne, meta.nakshatra.name_en)
        : bilingualKundali(lang, meta.moon_sign.name_ne, meta.moon_sign.name_en),
      sub: meta.nakshatra
        ? kundaliLabelVars("report_meta_pada", lang, { pada: meta.nakshatra.pada })
        : kundaliLabel("report_meta_moon_sign", lang),
    },
    {
      label: kundaliLabel("report_meta_sun", lang),
      value: bilingualKundali(lang, meta.sun_sign.name_ne, meta.sun_sign.name_en),
    },
    {
      label: kundaliLabel("report_meta_mahadasha", lang),
      value: meta.mahadasha
        ? `${bilingualKundali(lang, meta.mahadasha.lord_ne, meta.mahadasha.lord_en)}${
            meta.mahadasha.antardasha
              ? ` / ${bilingualKundali(
                  lang,
                  meta.mahadasha.antardasha_ne ?? meta.mahadasha.antardasha ?? "",
                  meta.mahadasha.antardasha_en ?? meta.mahadasha.antardasha ?? "",
                )}`
              : ""
          }`
        : "—",
      sub:
        meta.mahadasha?.antardasha_ends
          ? kundaliLabelVars("report_meta_antar_ends", lang, {
              date: meta.mahadasha.antardasha_ends,
            })
          : undefined,
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-2">
      {cells.map((c) => (
        <View key={c.label} className={cn(r.metaCell, "min-w-[46%] flex-1")}>
          <Text className={r.metaLabel} style={nepaliTextStyle(10)}>
            {c.label}
          </Text>
          <Text className={r.metaValue} style={nepaliTextStyle(14)}>
            {c.value}
          </Text>
          {c.sub ? (
            <Text className={r.metaSub} style={nepaliTextStyle(11)}>
              {c.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function KundaliReport({
  moment,
  location,
  ayanamsha,
  disabled,
}: {
  moment: InstantQuery;
  location?: LocationParams;
  ayanamsha?: string;
  disabled?: boolean;
}) {
  const { lang } = useLocale();
  const colors = useThemeColors();
  const [status, setStatus] = useState<Status>("idle");
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setMeta(null);
    setSections([]);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setFromCache(false);
  }, [lang]);

  const generate = useCallback(
    (force = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("streaming");
      setMeta(null);
      setSections([]);
      setProgress({ done: 0, total: 0 });
      setError(null);
      setFromCache(false);

      streamKundaliReport(
        moment,
        location,
        { ayanamsha, lang, force },
        (record) => {
          if (record.kind === "meta") {
            setMeta(record);
          } else if (record.kind === "section") {
            setSections((prev) => [...prev, record]);
            setProgress({ done: record.index + 1, total: record.total });
          } else if (record.kind === "done") {
            setStatus("done");
          }
        },
        controller.signal,
      )
        .then(({ fromCache: cached }) => {
          if (!controller.signal.aborted) setFromCache(cached);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setError(kundaliLabel("report_error_generic", lang));
          setStatus("error");
        });
    },
    [moment, location, ayanamsha, lang],
  );

  useEffect(() => {
    if (disabled) return;
    generate(false);
  }, [moment, location, ayanamsha, lang, disabled, generate]);

  const streaming = status === "streaming";

  return (
    <KundaliSection
      title={kundaliLabel("report_title", lang)}
      icon="document-text-outline"
    >
      <Text className={r.intro} style={nepaliTextStyle(14)}>
        {kundaliLabel("report_intro", lang)}
      </Text>

      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        {(status === "done" || status === "error") && (
          <Button
            label={kundaliLabel("report_regenerate", lang)}
            variant="outline"
            size="sm"
            onPress={() => generate(true)}
            disabled={disabled}
          />
        )}
        {(status === "idle" || streaming) && !disabled ? (
          <View className={r.statusPill}>
            <ActivityIndicator size="small" color={colors.secondary} />
            <Text className={r.statusText} style={nepaliTextStyle(13)}>
              {streaming && progress.total
                ? kundaliLabelVars("report_streaming_progress", lang, {
                    done: progress.done,
                    total: progress.total,
                  })
                : kundaliLabel("report_streaming_reading", lang)}
            </Text>
          </View>
        ) : null}
      </View>

      {(streaming || status === "done") && (
        <View className={cn("mt-4", r.confidenceRow)}>
          <Text className={r.confidenceLabel} style={nepaliTextStyle(12)}>
            {kundaliLabel("report_confidence_label", lang)}
          </Text>
          {(["strong", "moderate", "mixed", "tentative"] as ReportConfidence[]).map((lvl) => (
            <ConfidenceBadge key={lvl} level={lvl} />
          ))}
        </View>
      )}

      {error ? (
        <View className={cn("mt-4", r.errorBox)}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
          <Text className={cn(r.errorText, "flex-1")} style={nepaliTextStyle(14)}>
            {error}
          </Text>
        </View>
      ) : null}

      {meta ? <View className="mt-4"><MetaStrip meta={meta} /></View> : null}

      {sections.length > 0 ? (
        <View className="mt-4 gap-3">
          {sections.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </View>
      ) : null}

      {fromCache && status === "done" ? (
        <Text className={cn("mt-4", r.cacheNote)} style={nepaliTextStyle(12)}>
          {kundaliLabel("report_loaded_from_cache", lang)}
        </Text>
      ) : null}

      {status === "idle" && disabled ? (
        <View className={cn("mt-4", r.idleBox)}>
          <Ionicons name="document-text-outline" size={22} color={colors.mutedForeground} />
          <Text className={cn(r.idleText, "flex-1")} style={nepaliTextStyle(14)}>
            {kundaliLabel("report_idle_hint", lang)}
          </Text>
        </View>
      ) : null}

      {meta && (status === "done" || streaming) ? (
        <Text className={cn("mt-4", r.disclaimer)} style={nepaliTextStyle(12)}>
          {meta.disclaimer} · {meta.method}.
        </Text>
      ) : null}
    </KundaliSection>
  );
}
