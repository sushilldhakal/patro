/**
 * Small closed vocabularies the domain names and the API speaks.
 *
 * The domain owns these words; @vedic-patro/api-client re-exports them and builds
 * its response shapes from them (the same way it takes Era from ./era), so domain
 * code can use them without depending on the API contract.
 */

/** Navatara / tarabala verdict for a day or a rashi. */
export type NavataraTone = "best" | "good" | "neutral" | "bad" | "worst";

/** A native's per-day sait verdict. */
export type SaitSuitability = "favourable" | "neutral" | "avoid";

export const RASHIFAL_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type RashifalPeriod = (typeof RASHIFAL_PERIODS)[number];

/** How one graha regards another (naisargika + tatkalika combined). */
export type GrahaRelation = "self" | "friend" | "enemy" | "neutral";

/** A graha's dignity in the sign it occupies. */
export type GrahaDignity =
  | "exalted"
  | "moolatrikona"
  | "own"
  | "friend_house"
  | "neutral_house"
  | "enemy_house"
  | "debilitated";

/** How a panchanga element's page lays out its data. */
export type ElementKind = "span" | "table";
