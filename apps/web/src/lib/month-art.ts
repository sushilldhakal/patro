/** BS month hero art — 1 = बैशाख … 12 = चैत्र. */
import month1 from "@/assets/month/1.avif";
import month2 from "@/assets/month/2.avif";
import month3 from "@/assets/month/3.avif";
import month4 from "@/assets/month/4.avif";
import month5 from "@/assets/month/5.avif";
import month6 from "@/assets/month/6.avif";
import month7 from "@/assets/month/7.avif";
import month8 from "@/assets/month/8.avif";
import month9 from "@/assets/month/9.avif";
import month10 from "@/assets/month/10.avif";
import month11 from "@/assets/month/11.avif";
import month12 from "@/assets/month/12.avif";

const BS_MONTH_ART: Record<number, string> = {
  1: month1,
  2: month2,
  3: month3,
  4: month4,
  5: month5,
  6: month6,
  7: month7,
  8: month8,
  9: month9,
  10: month10,
  11: month11,
  12: month12,
};

export function bsMonthArtUrl(month: number): string {
  const m = Math.min(12, Math.max(1, Math.round(month)));
  return BS_MONTH_ART[m]!;
}
