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
import type { InstantQuery } from "@/lib/instant-query";
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
import { cn } from "@/lib/utils";

type Status = "idle" | "streaming" | "done" | "error";

const CONFIDENCE_KEYS: Record<ReportConfidence, KundaliI18nKey> = {
  strong: "report_confidence_strong",
  moderate: "report_confidence_moderate",
  mixed: "report_confidence_mixed",
  tentative: "report_confidence_tentative",
};

const CONFIDENCE_TONE: Record<ReportConfidence, string> = {
  strong: "border-emerald-500/30 bg-emerald-500/15",
  moderate: "border-sky-500/30 bg-sky-500/15",
  mixed: "border-amber-500/30 bg-amber-500/15",
  tentative: "border-border bg-muted/40",
};

function localizeItemLabel(label: string, isEnglish: boolean): string {
  if (isEnglish) return label;
  const paired = label.match(/^(.+?) \(([^)]+)\)$/);
  if (paired) return paired[2].trim();
  const house = label.match(/^House (\d+) \(([^)]+)\)$/i);
  if (house) return `${house[2]} भाव`;
  return label;
}

function ConfidenceBadge({ level }: { level: ReportConfidence }) {
  const { lang } = useLocale();
  return (
    <View className={cn("rounded-full border px-2 py-0.5", CONFIDENCE_TONE[level])}>
      <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(11)}>
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
    <View className="mt-2">
      <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center gap-1 active:opacity-70">
        <Ionicons name="information-circle-outline" size={14} color="#888" />
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
          {kundaliLabelVars("report_factors_based", lang, { count: factors.length })}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color="#888"
        />
      </Pressable>
      {open ? (
        <View className="mt-1.5 border-l-2 border-border pl-3">
          {factors.map((f, i) => (
            <Text key={i} className="text-caption text-foreground" style={nepaliTextStyle(12)}>
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
    <Card className="gap-2 p-3">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-body min-w-0 flex-1 font-semibold text-foreground" style={nepaliTextStyle(13)}>
          {localizeItemLabel(item.label, isEnglish)}
        </Text>
        <ConfidenceBadge level={item.confidence} />
      </View>
      <Text className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
        {item.text}
      </Text>
      <FactorList factors={item.factors} />
    </Card>
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
    <Card className={cn("gap-3 p-4", section.optional ? "border-dashed" : undefined)}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
          {title}
        </Text>
        {isEnglish ? (
          <Text className="text-caption uppercase tracking-wider text-muted-foreground" style={nepaliTextStyle(11)}>
            {section.title_en}
          </Text>
        ) : null}
        {section.confidence ? (
          <View className="ml-auto">
            <ConfidenceBadge level={section.confidence} />
          </View>
        ) : null}
      </View>

      {section.body.map((p, i) => (
        <Text key={i} className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
          {p}
        </Text>
      ))}

      {section.confidence ? <FactorList factors={section.factors} /> : null}

      {section.items && section.items.length > 0 ? (
        <View className="flex-row flex-wrap gap-2.5">
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
        <View key={c.label} className="min-w-[46%] flex-1 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <Text className="text-caption font-semibold uppercase tracking-wide text-muted-foreground" style={nepaliTextStyle(10)}>
            {c.label}
          </Text>
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
            {c.value}
          </Text>
          {c.sub ? (
            <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(11)}>
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
      <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
        {kundaliLabel("report_intro", lang)}
      </Text>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
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
          <View className="flex-row items-center gap-2 rounded-lg border border-border px-3 py-2">
            <ActivityIndicator size="small" color={colors.secondary} />
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
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
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
            {kundaliLabel("report_confidence_label", lang)}
          </Text>
          {(["strong", "moderate", "mixed", "tentative"] as ReportConfidence[]).map((lvl) => (
            <ConfidenceBadge key={lvl} level={lvl} />
          ))}
        </View>
      )}

      {error ? (
        <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
          <Text className="text-body flex-1 text-destructive" style={nepaliTextStyle(14)}>
            {error}
          </Text>
        </View>
      ) : null}

      {meta ? <View className="mt-3"><MetaStrip meta={meta} /></View> : null}

      {sections.length > 0 ? (
        <View className="mt-3 gap-3">
          {sections.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </View>
      ) : null}

      {fromCache && status === "done" ? (
        <Text className="text-caption mt-3 text-muted-foreground" style={nepaliTextStyle(12)}>
          {kundaliLabel("report_loaded_from_cache", lang)}
        </Text>
      ) : null}

      {status === "idle" && disabled ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6">
          <Ionicons name="document-text-outline" size={22} color={colors.mutedForeground} />
          <Text className="text-body flex-1 text-muted-foreground" style={nepaliTextStyle(14)}>
            {kundaliLabel("report_idle_hint", lang)}
          </Text>
        </View>
      ) : null}

      {meta && (status === "done" || streaming) ? (
        <Text className="text-caption mt-4 border-t border-border pt-3 leading-relaxed text-muted-foreground" style={nepaliTextStyle(12)}>
          {meta.disclaimer} · {meta.method}.
        </Text>
      ) : null}
    </KundaliSection>
  );
}
