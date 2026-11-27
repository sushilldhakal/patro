/**
 * The Vikram year range the mobile pickers, year wheel and 3D sky offer. The
 * shared calendar table (packages/domain) now covers more years than the app
 * has ever shown, so the app states its own limits here.
 */
export const BS_SUPPORTED_START_YEAR = 1700;
export const BS_SUPPORTED_END_YEAR = 2200;

/** The BS years whose sky ships inside the app (assets/sky, lib/sky.ts): computed on the phone, offline, with nothing to download. */
export const SKY_BUILT_IN_START_YEAR = 1950;
export const SKY_BUILT_IN_END_YEAR = 2150;
export const isBuiltInYear = (year: number) => year >= SKY_BUILT_IN_START_YEAR && year <= SKY_BUILT_IN_END_YEAR;
