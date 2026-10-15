import { View } from "react-native";
import { NakshatraReferenceTable, RashiReferenceTable } from "@vedic-patro/ui/kit/learn";

/** Rashi and nakshatra tables for the "how we calculate" chapter. */
export function ComputationReferenceDiagram() {
  return (
    <View className="gap-6">
      <RashiReferenceTable />
      <NakshatraReferenceTable />
    </View>
  );
}
