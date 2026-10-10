/**
 * Patro date navigation — three variants, one core implementation.
 *
 * - {@link PatroMonthYearNav} — month + year (home, month browse)
 * - {@link PatroDayTimeNav} — day + month + year, optional time (panchanga)
 * - {@link PatroYearNav} — year only (graha yearly pages)
 */
export { PatroDateNavCore, type PatroDateNavCoreProps } from "./PatroDateNavCore";
export { PatroMonthYearNav, type PatroMonthYearNavProps } from "./PatroMonthYearNav";
export { PatroDayTimeNav, type PatroDayTimeNavProps } from "./PatroDayTimeNav";
export { PatroYearNav, type PatroYearNavProps } from "./PatroYearNav";
export { PatroDayMonthChip } from "./PatroDayMonthChip";

export {
  buildPatroAdYearOptions,
  buildBsDayOptions,
  pickBsDate,
  isAtMinBsDay,
  isAtMaxBsDay,
} from "@/lib/patro-date-options";
