export function scrubGToDatetime(
  anchorAd: string,
  scrubG: number,
  sunriseMin: number
): string {
  const totalMin = sunriseMin + scrubG * 24;
  const dayOffset = Math.floor(totalMin / 1440);
  const minsInDay = totalMin - dayOffset * 1440;
  const h = Math.floor(minsInDay / 60);
  const m = Math.round(minsInDay % 60);
  const [y, mo, d] = anchorAd.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d! + dayOffset);
  const ad = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${ad}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
