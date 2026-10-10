import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n";
import type { AstaStamp, EclipseEvent } from "@/lib/api";
import { localTimeShortFromIso } from "@vedic-patro/domain/time-format";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

function renderedEclipseDate(ev: EclipseEvent): string {
  const label = ev.date_jd_date?.trim();
  if (label) return label;
  return ev.date_bs ?? ev.date_ad ?? "";
}

function eclipseMaxTime(ev: EclipseEvent): string | null {
  return localTimeShortFromIso(ev.max_local) ?? ev.maximum_time_local_short ?? null;
}

function eclipseVisible(ev: EclipseEvent): boolean {
  if (typeof ev.visible === "boolean") return ev.visible;
  const ne = ev.visible_ne ?? "";
  return /देखिन|visible/i.test(ne);
}

export function EclipseCard({ ev, pageId }: { ev: EclipseEvent; pageId: string }) {
  const { pick, digits, lang } = useLocale();
  const colors = useThemeColors();
  const isLunar = pageId === "chandra-grahan";
  const typeLabel = lang === "en" ? ev.type_en ?? ev.type ?? "" : ev.type_ne ?? ev.type ?? "";
  const dateLabel = renderedEclipseDate(ev);
  const visible = eclipseVisible(ev);
  const begin = localTimeShortFromIso(ev.begin_local);
  const end = localTimeShortFromIso(ev.end_local);
  const max = eclipseMaxTime(ev);

  return (
    <Card className="overflow-hidden p-0">
      <View
        className={cn(
          "flex-row items-baseline justify-between gap-2 border-b border-border px-3.5 py-2.5",
          visible ? "bg-emerald-500/10" : "bg-muted/30",
        )}
      >
        <Text className="text-body min-w-0 flex-1 font-bold text-foreground" style={nepaliTextStyle(16)}>
          {typeLabel}
        </Text>
        <View
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5",
            visible ? "bg-emerald-500/20" : "bg-foreground/10",
          )}
        >
          <Text
            className="text-caption font-bold"
            style={{
              color: visible ? colors.secondary : colors.mutedForeground,
              ...nepaliTextStyle(11),
            }}
          >
            {visible
              ? pick("नेपालबाट देखिन्छ", "Visible from Nepal")
              : pick("नेपालबाट देखिँदैन", "Not visible from Nepal")}
          </Text>
        </View>
      </View>
      <View className="gap-1.5 p-3.5">
        <EclipseDetailRow label={pick("मिति", "Date")} value={digits(dateLabel)} />
        <EclipseDetailRow label={pick("चरम", "Maximum")} value={max ? digits(max) : "—"} />
        {visible && begin ? (
          <EclipseDetailRow
            label={
              isLunar
                ? pick("आंशिक आरम्भ", "Partial begins")
                : pick("पहिलो स्पर्श", "First contact")
            }
            value={digits(begin)}
          />
        ) : null}
        {visible && end ? (
          <EclipseDetailRow
            label={
              isLunar ? pick("आंशिक अन्त", "Partial ends") : pick("अन्तिम स्पर्श", "Last contact")
            }
            value={digits(end)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function EclipseDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-2">
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className="text-body font-num font-semibold text-foreground">{value}</Text>
    </View>
  );
}


export function StampLine({
  label,
  stamp,
}: {
  label: string;
  stamp: AstaStamp | null;
}) {
  const { digits } = useLocale();
  if (!stamp) {
    return (
      <Text className="text-caption text-muted-foreground">
        {label}: —
      </Text>
    );
  }
  const date = stamp.date_bs ?? stamp.date_ad ?? stamp.date ?? "";
  return (
    <Text className="text-body text-foreground">
      <Text className="font-semibold">{label}: </Text>
      {digits(date)} · {digits(stamp.time_short)}
    </Text>
  );
}

export function GrahaPeriodCard({
  titleNe,
  titleEn,
  grahaNe,
  start,
  end,
  extraNe,
  extraEn,
}: {
  titleNe?: string;
  titleEn?: string;
  grahaNe: string;
  start: AstaStamp | null;
  end: AstaStamp | null;
  extraNe?: string;
  extraEn?: string;
}) {
  const { pick } = useLocale();
  return (
    <Card className="mb-2 gap-1 p-3">
      {titleNe ? (
        <Text className="text-caption font-bold uppercase text-muted-foreground">
          {pick(titleNe, titleEn ?? titleNe)}
        </Text>
      ) : null}
      <Text className="text-body font-semibold text-foreground">{grahaNe}</Text>
      <StampLine label={pick("सुरु", "Start")} stamp={start} />
      <StampLine label={pick("अन्त", "End")} stamp={end} />
      {extraNe ? (
        <Text className="text-caption text-muted-foreground">{pick(extraNe, extraEn ?? extraNe)}</Text>
      ) : null}
    </Card>
  );
}

export function SimpleEventCard({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle?: string;
  body?: string;
}) {
  return (
    <Card className="mb-2 gap-1 p-3">
      <Text className="text-body font-semibold text-foreground">{title}</Text>
      {subtitle ? <Text className="text-body text-muted-foreground">{subtitle}</Text> : null}
      {body ? <Text className="text-body text-foreground">{body}</Text> : null}
    </Card>
  );
}

export function EmptyHint({ ne, en }: { ne: string; en: string }) {
  const { pick } = useLocale();
  return (
    <View className="py-8">
      <Text className="text-body text-center text-muted-foreground">{pick(ne, en)}</Text>
    </View>
  );
}
