export function hasDevanagari(value: string): boolean {
  return /[\u0900-\u097F]/.test(value);
}

/** API uses "custom" for lat/lon queries — keep the user's chosen label instead. */
export const GENERIC_API_LOCATION_NAMES = new Set(["custom"]);
