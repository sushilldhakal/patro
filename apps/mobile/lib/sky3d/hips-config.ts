import Constants from "expo-constants";
import { Platform } from "react-native";

import { configureHipsBaseUrl } from "@vedic-patro/domain/astronomy/sky3d/hips";

/**
 * The tiles are static files, not bundled (a bundler cannot build a path from a
 * runtime tile number). Native fetches them from the production host the website
 * serves them from; the web build is same-origin; only `expo start --web` needs
 * the `/sky3d/*` proxy `metro.config.js` sets up.
 */
const HIPS_PROD_HOST = "https://www.vedicpatro.com";
/** The site host behind `.../api`; a local dev API (no `/api` suffix) has no sky tiles, so production. */
const siteHost = (api: string | undefined, fallback: string) =>
  api && /\/api\/?$/.test(api) ? api.replace(/\/api\/?$/, "") : fallback;
configureHipsBaseUrl(
  Platform.OS === "web" && __DEV__
    ? "/sky3d/milkyway-hips"
    : `${siteHost(Constants.expoConfig?.extra?.apiBaseUrl as string | undefined, HIPS_PROD_HOST)}/sky3d/milkyway-hips`,
);
