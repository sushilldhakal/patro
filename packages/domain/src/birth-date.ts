/**
 * Birth date/time input helpers — used by the profile form (live masking) and
 * the Kundali page (parsing saved values). Tolerant of Nepali digits so Nepali
 * users can type either script.
 */

const NE_DIGITS = "०१२३४५६७८९";

/** Convert Devanagari digits (०१२…) to ASCII (012…). */
export function toAsciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (c) => String(NE_DIGITS.indexOf(c)));
}

/**
 * Consume one 1–2 digit field (month, day, hour, minute) from a digit string,
 * resolving ambiguity smartly: if the leading two digits can't be a valid value
 * (e.g. "81" for a month, "71" for an hour) the first digit is taken as a
 * zero-padded single value ("08", "07") and only one digit is consumed.
 *
 * A two-digit value can only *start* with digit `t` when `t*10 <= max` (or
 * `t === 0`). So month/day can't begin 2–9 / 4–9, hour can't begin 3–9, minute
 * can't begin 6–9 — in those cases we pad and split immediately.
 *
 * Returns the (possibly partial) text, how many digits were used, and whether
 * the field is complete (so callers know when to emit the separator).
 */
function consumeUnit(
  digits: string,
  min: number,
  max: number,
): { text: string; used: number; complete: boolean } {
  if (digits.length === 0) return { text: "", used: 0, complete: false };
  const first = Number(digits[0]);
  const canStartTwoDigit = first === 0 || first * 10 <= max;

  if (digits.length === 1) {
    // Only one digit so far: keep it partial if it could still grow into a
    // valid two-digit value; otherwise pad-and-finish (e.g. "8" → "08").
    if (canStartTwoDigit) return { text: digits, used: 1, complete: false };
    return { text: "0" + digits, used: 1, complete: true };
  }

  const two = digits.slice(0, 2);
  const value = Number(two);
  if (canStartTwoDigit && value >= min && value <= max) {
    return { text: two, used: 2, complete: true };
  }
  // Two-digit reading is invalid ("81", "13", "24") → single zero-padded digit.
  return { text: "0" + digits[0], used: 1, complete: true };
}

/**
 * Mask a date input to YYYY-MM-DD as the user types: dashes are inserted
 * automatically after the year and the month. Non-digits (slashes, dots) are
 * ignored, so "2050/02/30" and "20500230" both become "2050-02-30".
 *
 * Smart splitting: "2021819" → "2021-08-19" (81 can't be a month, so 8 → 08).
 */
export function formatDateInput(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, "").slice(0, 8);
  const year = digits.slice(0, 4);
  if (year.length < 4) return year;

  let out = year;
  let rest = digits.slice(4);

  const month = consumeUnit(rest, 1, 12);
  if (!month.text) return out;
  out += "-" + month.text;
  rest = rest.slice(month.used);

  const day = consumeUnit(rest, 1, 31);
  if (day.text) out += "-" + day.text;
  return out;
}

/**
 * Mask a time input to HH:MM, inserting the colon after the hour.
 *
 * Smart splitting: "714" → "07:14" (71 can't be an hour, so 7 → 07).
 */
export function formatTimeInput(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, "").slice(0, 4);
  const hour = consumeUnit(digits, 0, 23);
  if (!hour.text) return "";

  let out = hour.text;
  const rest = digits.slice(hour.used);
  if (hour.complete && rest.length > 0) {
    out += ":" + consumeUnit(rest, 0, 59).text;
  }
  return out;
}

/**
 * Parse a stored birth date (any separator, Nepali or ASCII digits) into
 * year/month/day. Returns null if it can't find a YYYY M D pattern.
 */
export function parseBirthDateParts(raw: string): { y: number; m: number; d: number } | null {
  const s = toAsciiDigits(raw).trim();
  const sep = /(\d{4})\s*\D+\s*(\d{1,2})\s*\D+\s*(\d{1,2})/.exec(s);
  if (sep) return { y: +sep[1], m: +sep[2], d: +sep[3] };
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return { y: +digits.slice(0, 4), m: +digits.slice(4, 6), d: +digits.slice(6, 8) };
}
