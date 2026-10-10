import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

/** Reference/data table — headers + rows of already-resolved cell content. */
export function LearnTable({
  caption,
  headers,
  rows,
}: {
  caption?: ReactNode;
  headers: ReactNode[];
  rows: ReactNode[][];
}) {
  return (
    <View className="gap-1.5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="overflow-hidden rounded-xl border border-border">
          <View className="flex-row bg-muted/40">
            {headers.map((h, i) => (
              <View key={i} className="min-w-[104px] px-3 py-2">
                <Text
                  className="text-caption font-bold uppercase tracking-wide text-muted-foreground"
                  style={nepaliTextStyle(10)}
                >
                  {h}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View
              key={ri}
              className={`flex-row ${ri % 2 === 1 ? "bg-muted/15" : ""} border-t border-border`}
            >
              {row.map((cell, ci) => (
                <View key={ci} className="min-w-[104px] px-3 py-2">
                  <Text className="text-body text-foreground" style={nepaliTextStyle(13)}>
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {caption ? (
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
