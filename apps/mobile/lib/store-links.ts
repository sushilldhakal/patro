import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const PRIVACY_POLICY_URL =
  extra.privacyPolicyUrl || "https://www.vedicpatro.com/privacy";
export const TERMS_OF_USE_URL = extra.termsOfUseUrl || "https://www.vedicpatro.com/terms";
export const SUPPORT_URL = extra.supportUrl || "https://www.vedicpatro.com";
export const SUPPORT_EMAIL = extra.supportEmail || "vedicnepalpatro@gmail.com";
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const ANDROID_PACKAGE = "com.vedicpatro.mobile";
/** Numeric App Store id (apps.apple.com/app/id6820382502); `extra.appStoreId` can override it. */
const APP_STORE_ID = extra.appStoreId || "6820382502";

export const PLAY_STORE_URL =
  extra.playStoreUrl || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** Store page for the current platform — opened by "Rate Vedic Patro". */
export function storeListingUrl(os: string): string {
  return os === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
}

/** The store's "write a review" page: the App Store's review sheet, or the app's Play page. */
export function reviewUrl(os: string): string {
  if (os === "ios") return `${APP_STORE_URL}?action=write-review`;
  return `${PLAY_STORE_URL}&showAllReviews=true`;
}

export function feedbackMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
