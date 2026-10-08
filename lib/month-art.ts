import type { ImageSourcePropType } from "react-native";

/** BS month hero art — 1 = बैशाख … 12 = चैत्र. Same illustrations as the web hero. */
const BS_MONTH_ART: Record<number, ImageSourcePropType> = {
  1: require("../assets/month/1.jpg"),
  2: require("../assets/month/2.jpg"),
  3: require("../assets/month/3.jpg"),
  4: require("../assets/month/4.jpg"),
  5: require("../assets/month/5.jpg"),
  6: require("../assets/month/6.jpg"),
  7: require("../assets/month/7.jpg"),
  8: require("../assets/month/8.jpg"),
  9: require("../assets/month/9.jpg"),
  10: require("../assets/month/10.jpg"),
  11: require("../assets/month/11.jpg"),
  12: require("../assets/month/12.jpg"),
};

export function bsMonthArt(month: number): ImageSourcePropType {
  const m = Math.min(12, Math.max(1, Math.round(month)));
  return BS_MONTH_ART[m]!;
}
