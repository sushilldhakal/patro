import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { GocharGraha } from "@/lib/api";
import { buildGocharBhavaHouses, formatGocharBsLabel } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale } from "@/lib/i18n";

type GrahaRow = GocharGraha & { key: string };

type Props = {
  grahas: GrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** When true, omit title (shown in GocharRashyadiBlock header row). */
  hideTitle?: boolean;
};

export function GocharKundaliChart({
  grahas,
  papanshaLine = "",
  gapanshaLine = "",
  dateBs,
  dateAd,
  loading,
  className,
  hideTitle,
}: Props) {
  const { pick } = useLocale();
  const dateLabel = formatGocharBsLabel(dateBs, dateAd);

  return (
    <View className={cn("rounded-xl border border-border p-4", className)}>
      {!hideTitle ? (
        <View className="mb-2 flex-row items-center gap-1.5">
          <Text className="text-body font-semibold text-foreground">
            ✦ {pick("गोचर कुण्डली", "Transit Chart")}
          </Text>
        </View>
      ) : null}

      <View className={cn("gap-2", hideTitle ? undefined : "mb-3")}>
        <View className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
          <Text className="text-body font-num leading-relaxed text-foreground">
            {papanshaLine || pick("पापाशाः—", "Papashah —")}
          </Text>
        </View>
        {gapanshaLine ? (
          <View className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
            <Text className="text-body font-num leading-relaxed text-foreground">{gapanshaLine}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <Text className="text-body py-8 text-center text-muted-foreground">
          {pick("लोड हुँदैछ…", "Loading…")}
        </Text>
      ) : grahas.length === 0 ? (
        <Text className="text-body py-8 text-center text-muted-foreground">
          {pick("विवरण उपलब्ध छैन।", "No details available.")}
        </Text>
      ) : (
        <D1Chart houses={buildGocharBhavaHouses(grahas)} />
      )}

      {dateLabel ? (
        <Text className="text-body mt-2 text-center text-muted-foreground">
          {pick(`${dateLabel} को स्थिति`, `Position on ${dateLabel}`)}
        </Text>
      ) : null}
    </View>
  );
}
