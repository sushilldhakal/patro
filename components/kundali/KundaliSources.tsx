import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

/**
 * The "classical sources" card under each Kundali section — same ids and copy
 * keys as web's `KundaliView` source blocks, so a section cites the same
 * works on both platforms.
 */
type SourceGroup = {
  /** Catalogue key prefix: `kundali.sources.<prefix>.<id>.{credit,edition,used}`. */
  prefix: string | null;
  ids: readonly string[];
};

const SOURCE_GROUPS = {
  yoga: { prefix: null, ids: ["bphs"] },
  dasha: { prefix: "dasha", ids: ["vimshottari", "tribhagi", "yogini"] },
  shadbala: { prefix: "shadbala", ids: ["bphs", "saravali", "jatakparijat"] },
  bhavabala: {
    prefix: "bhavabala",
    ids: ["phaladeepika", "brihatjataka", "horasara", "sripatipaddhati", "jatakparijat"],
  },
  ashtakavarga: { prefix: "ashtakavarga", ids: ["bphs", "jatakparijat"] },
  vimshopaka: { prefix: "vimshopaka", ids: ["bphs", "jatakparijat"] },
  shanti: {
    prefix: "shanti",
    ids: [
      "yajnavalkya",
      "bphs",
      "puranas",
      "phaladeepika",
      "muhurtachintamani",
      "uttarakalamrita",
      "lalkitab",
    ],
  },
} satisfies Record<string, SourceGroup>;

export type KundaliSourcesKind = keyof typeof SOURCE_GROUPS;

export function KundaliSources({ kind }: { kind: KundaliSourcesKind }) {
  const { t, digits } = useLocale();
  const group: SourceGroup = SOURCE_GROUPS[kind];
  const key = (id: string, field: string) =>
    group.prefix ? `kundali.sources.${group.prefix}.${id}.${field}` : `kundali.sources.${id}.${field}`;

  return (
    <View className="mb-4 rounded-xl border border-border bg-muted/40 p-3.5">
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {t("kundali.sources.heading")}
      </Text>
      <Text className="text-body mt-1.5 text-muted-foreground" style={nepaliTextStyle(13)}>
        {t("kundali.sources.blurb")}
      </Text>
      <View className="mt-4 gap-4">
        {group.ids.map((id, i) => (
          <View key={id} className="flex-row gap-3">
            <Text className="text-body w-5 font-semibold text-muted-foreground">{digits(i + 1)}.</Text>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(13)}>
                {t(key(id, "credit"))}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(key(id, "edition"))}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
                {t(key(id, "used"))}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
