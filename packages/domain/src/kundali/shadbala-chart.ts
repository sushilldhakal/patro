export type ShadbalaScale = "virupas" | "rupas" | "absolute" | "required";

export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}

export function formatScaleValue(value: number, scale: ShadbalaScale, digits: (v: string | number) => string): string {
  if (scale === "required" || scale === "absolute") return `${digits(Math.round(value))}%`;
  return digits(value >= 100 ? value.toFixed(0) : value.toFixed(1));
}

export function fmt(value: number | undefined, digits: (v: string | number) => string, places = 2): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(places);
  const signed = value < 0 ? `−${abs}` : abs;
  return digits(signed);
}
