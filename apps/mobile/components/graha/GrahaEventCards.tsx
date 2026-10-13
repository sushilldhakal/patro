import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n";
import type { AstaStamp, EclipseEvent } from "@/lib/api";
import { localTimeShortFromIso } from "@vedic-patro/domain/time-format";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { renderedEclipseDate } from "@vedic-patro/domain/eclipse-date";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

function eclipseMaxTime(ev: EclipseEvent): string | null {
  return localTimeShortFromIso(ev.max_local) ?? ev.maximum_time_local_short ?? null;
}

function eclipseVisible(ev: EclipseEvent): boolean {
  if (typeof ev.visible === "boolean") return ev.visible;
  const ne = ev.visible_ne ?? "";
  return /देखिन|visible/i.test(ne);
}

export function EclipseCard({ ev, pageId }: { ev: EclipseEvent; pageId: string }) {
  const { t, pick, digits, lang } = useLocale();
  const colors = useThemeColors();
  const isLunar = pageId === "chandra-grahan";
  const typeLabel = lang === "en" ? ev.type_en ?? ev.type ?? "" : ev.type_ne ?? ev.type ?? "";
  const dateLabel = renderedEclipseDate(ev);
  const visible = eclipseVisible(ev);
  const begin = localTimeShortFromIso(ev.begin_local);
  const end = localTimeShortFromIso(ev.end_local);
  const max = eclipseMaxTime(ev);

  return (
    <Card className={cn(grahaClasses.eclipseCard, "p-0")}>
      <View
        className={cn(
          "flex-row",
          grahaClasses.eclipseHead,
          visible ? grahaClasses.eclipseHeadVisible : grahaClasses.eclipseHeadHidden,
        )}
      >
        <Text className={cn("min-w-0 flex-1", grahaClasses.eclipseType)} style={nepaliTextStyle(16)}>
          {typeLabel}
        </Text>
        <View
          className={cn(
            grahaClasses.eclipseBadge,
            visible ? grahaClasses.eclipseBadgeVisible : grahaClasses.eclipseBadgeHidden,
          )}
        >
          <Text
            className={grahaClasses.eclipseBadgeText}
            style={{
              color: visible ? colors.success : colors.mutedForeground,
              ...nepaliTextStyle(11),
            }}
          >
            {visible
              ? t("ui.graha.visible_from_nepal")
              : t("ui.graha.not_visible_from_nepal")}
          </Text>
        </View>
      </View>
      <View className={grahaClasses.eclipseBody}>
        <EclipseDetailRow label={t("graha_pages.eclipse.date")} value={digits(dateLabel)} strong />
        <EclipseDetailRow label={t("ui.graha.maximum")} value={max ? digits(max) : "—"} />
        {visible && begin ? (
          <EclipseDetailRow
            label={
              isLunar
                ? t("graha_pages.eclipse.partial_begins")
                : t("ui.graha.first_contact")
            }
            value={digits(begin)}
          />
        ) : null}
        {visible && end ? (
          <EclipseDetailRow
            label={
              isLunar ? t("ui.graha.partial_ends") : t("ui.graha.last_contact")
            }
            value={digits(end)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function EclipseDetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className={cn("flex-row", grahaClasses.eclipseRow)}>
      <Text className={grahaClasses.eclipseLabel} style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className={strong ? cn(grahaClasses.eclipseValue, "font-semibold") : grahaClasses.eclipseValue}>{value}</Text>
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
      <Text className="text-xs text-muted-foreground">
        {label}: —
      </Text>
    );
  }
  const date = stamp.date_bs ?? stamp.date_ad ?? stamp.date ?? "";
  return (
    <Text className="text-sm text-foreground">
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
  const { t, pick } = useLocale();
  return (
    <Card className="mb-2 gap-1 p-3">
      {titleNe ? (
        <Text className="text-xs font-bold uppercase text-muted-foreground">
          {pick(titleNe, titleEn ?? titleNe)}
        </Text>
      ) : null}
      <Text className="text-sm font-semibold text-foreground">{grahaNe}</Text>
      <StampLine label={t("ui.common.start")} stamp={start} />
      <StampLine label={t("kundali.dasha_end")} stamp={end} />
      {extraNe ? (
        <Text className="text-xs text-muted-foreground">{pick(extraNe, extraEn ?? extraNe)}</Text>
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
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
      {body ? <Text className="text-sm text-foreground">{body}</Text> : null}
    </Card>
  );
}

export function EmptyHint({ ne, en }: { ne: string; en: string }) {
  const { pick } = useLocale();
  return (
    <View className={grahaClasses.emptyHint}>
      <Text className={grahaClasses.emptyHintText}>{pick(ne, en)}</Text>
    </View>
  );
}
