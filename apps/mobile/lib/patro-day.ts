/** Civil ISO date helpers (YYYY-MM-DD, no time). */

/** Parse proleptic Gregorian ``YYYY-MM-DD`` / ``-YYYY-MM-DD`` (API ``date_ad``). */
export function parseCivilIso(iso: string): { year: number; month: number; day: number } {
  let text = iso.trim();
  if (!text) throw new Error("empty civil iso date");
  let sign = 1;
  if (text.startsWith("-")) {
    sign = -1;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  const parts = text.split("-");
  if (parts.length !== 3) throw new Error(`invalid civil iso date: ${iso}`);
  return {
    year: sign * parseInt(parts[0]!, 10),
    month: parseInt(parts[1]!, 10),
    day: parseInt(parts[2]!, 10),
  };
}

/** Canonical ``YYYY-MM-DD`` for maps / API merge (matches Python ``date.isoformat()``). */
export function canonicalCivilIso(iso: string): string {
  const { year, month, day } = parseCivilIso(iso);
  if (year <= 0) {
    return `-${String(Math.abs(year)).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const PATRO_DAY_KEY = /^(-?\d+)-(\d{2})-(\d{2})$/;

export function parsePatroDayDateKey(value: string): { year: number; month: number; day: number } {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("invalid patro day date: empty");
  const m = trimmed.match(PATRO_DAY_KEY);
  if (!m) throw new Error(`invalid patro day date: ${value}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Vikram date key for gochar ingress (matches API `format_bs_date`). */
export function formatBsDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function civilIsoDayOfMonth(iso: string): number {
  return parseCivilIso(iso).day;
}

export function parseCivilIsoToDate(iso: string): Date {
  const { year, month, day } = parseCivilIso(iso);
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00`);
}

export function civilIsoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addCivilDays(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}
