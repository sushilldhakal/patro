import { formatBsIsoDateNepali } from "@vedic-patro/domain/panchanga-format";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n";
import type { AstaStamp } from "@/lib/api";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import type { EclipseCardView } from "@vedic-patro/features/graha";

/** One eclipse — drawn from the shared card data (@vedic-patro/features/graha). */
export function EclipseCard({ card }: { card: EclipseCardView }) {
  const colors = useThemeColors();
  return (
    <Card className={cn(grahaClasses.eclipseCard, "p-0")}>
      <View className={cn("flex-row", grahaClasses.eclipseHead, card.visible ? grahaClasses.eclipseHeadVisible : grahaClasses.eclipseHeadHidden)}>
        <Text className={cn("min-w-0 flex-1", grahaClasses.eclipseType)} style={nepaliTextStyle(16)}>
          {card.type}
        </Text>
        <View className={cn(grahaClasses.eclipseBadge, card.visible ? grahaClasses.eclipseBadgeVisible : grahaClasses.eclipseBadgeHidden)}>
          <Text
            className={grahaClasses.eclipseBadgeText}
            style={{ color: card.visible ? colors.success : colors.mutedForeground, ...nepaliTextStyle(11) }}
          >
            {card.visibility}
          </Text>
        </View>
      </View>
      <View className={grahaClasses.eclipseBody}>
        {card.rows.map((row) => (
          <EclipseDetailRow key={row.label} label={row.label} value={row.value} strong={row.strong} />
        ))}
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
  const { digits, lang } = useLocale();
  if (!stamp) {
    return (
      <Text className="text-xs text-muted-foreground">
        {label}: —
      </Text>
    );
  }
  /* "साउन २९, २०८३" like the asta page, not a bare "२०८३-०३-१५". */
  const date = formatBsIsoDateNepali(stamp.date_bs, { lang }) ?? stamp.date_ad ?? stamp.date ?? "";
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

export function EmptyHint({ text }: { text: string }) {
  return (
    <View className={grahaClasses.emptyHint}>
      <Text className={grahaClasses.emptyHintText}>{text}</Text>
    </View>
  );
}
