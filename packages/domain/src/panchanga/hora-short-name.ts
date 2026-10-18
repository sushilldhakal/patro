/** Hora lords whose names outgrow a ~2½-ghati band, and the short forms the band shows instead. */
const HORA_SHORT: Record<string, string> = {
  आदित्य: "आदि",
  बृहस्पति: "बृह",
  Jupiter: "Jup",
  Mercury: "Merc",
  Saturn: "Sat",
};

/** Short form of a hora lord's name, or the name itself when it has none. */
export function horaShortName(name: string): string {
  return HORA_SHORT[name] ?? name;
}
