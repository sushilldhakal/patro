import { Linking, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { deviceStore } from "@/lib/device-store";
import { reviewUrl } from "@/lib/store-links";

/**
 * When to ask for a store review, without getting in the way:
 *  - only after the app has proved useful: opened on 5 different days, at least 4 days after the first;
 *  - at most 3 times ever, 60 days apart after "later";
 *  - never again once the user rated (or said no).
 *
 * How it asks depends on the build:
 *  - builds with expo-store-review: the system's own sheet (Apple's StoreKit, Google's in-app
 *    review). The OS also caps how often it appears and may skip it, so it never nags.
 *  - older builds on Android: a small card on Home with "rate" and "later" — no question first
 *    (Google's rules forbid gating on "do you like the app?").
 *  - older builds on iOS: nothing automatic. Apple only allows its own prompt; the "Rate Vedic
 *    Patro" link in the menu stays.
 */

const KEY = "review-prompt-v1";
const MIN_DAYS_USED = 5;
const MIN_DAYS_SINCE_FIRST = 4;
const MAX_ASKS = 3;
const DAYS_BETWEEN_ASKS = 60;

type State = {
  first: string;
  /** Distinct local dates the app was opened on (the last few are enough). */
  days: string[];
  /** All days counted so far. */
  used: number;
  asked: number;
  lastAsked: string | null;
  done: boolean;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

async function read(): Promise<State> {
  const s = await deviceStore.get<State>(KEY).catch(() => null);
  return s ?? { first: today(), days: [], used: 0, asked: 0, lastAsked: null, done: false };
}
const write = (s: State) => deviceStore.set(KEY, s).catch(() => {});

/** Count today as a day the app was used. Called when the app opens or comes to the front. */
export async function recordAppDay(): Promise<void> {
  const s = await read();
  const d = today();
  if (s.days.includes(d)) return;
  await write({ ...s, days: [...s.days, d].slice(-10), used: s.used + 1 });
}

/** Whether the app has earned an ask now. */
export async function reviewDue(): Promise<boolean> {
  const s = await read();
  const d = today();
  if (s.done || s.asked >= MAX_ASKS) return false;
  if (s.used < MIN_DAYS_USED || daysBetween(s.first, d) < MIN_DAYS_SINCE_FIRST) return false;
  return s.lastAsked == null || daysBetween(s.lastAsked, d) >= DAYS_BETWEEN_ASKS;
}

type StoreReview = { isAvailableAsync(): Promise<boolean>; requestReview(): Promise<void> };
let storeReview: StoreReview | null | undefined;
/** expo-store-review, only when this build has its native module (app updates reach older builds). */
function nativeReview(): StoreReview | null {
  if (storeReview !== undefined) return storeReview;
  storeReview = null;
  if (Platform.OS === "web" || !requireOptionalNativeModule("ExpoStoreReview")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storeReview = require("expo-store-review") as StoreReview;
  } catch {
    storeReview = null;
  }
  return storeReview;
}

/** "native": the system sheet was asked for; "card": show the Home card; "none": nothing to do. */
export async function askForReviewIfDue(): Promise<"native" | "card" | "none"> {
  if (!(await reviewDue())) return "none";
  const native = nativeReview();
  if (native && (await native.isAvailableAsync().catch(() => false))) {
    const s = await read();
    await write({ ...s, asked: s.asked + 1, lastAsked: today() });
    await native.requestReview().catch(() => {});
    return "native";
  }
  return Platform.OS === "android" ? "card" : "none";
}

/** The card's "rate": open the store's review page; never ask again. */
export async function rateNow(): Promise<void> {
  const s = await read();
  await write({ ...s, done: true, asked: s.asked + 1, lastAsked: today() });
  await Linking.openURL(reviewUrl(Platform.OS)).catch(() => {});
}

/** The card's "later": ask again in two months at the earliest (three asks in all). */
export async function rateLater(): Promise<void> {
  const s = await read();
  await write({ ...s, asked: s.asked + 1, lastAsked: today() });
}
