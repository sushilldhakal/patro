import Constants from "expo-constants";
import { Platform } from "react-native";

import { nebulaSources } from "@vedic-patro/domain/sky3d/nebulae";

/**
 * The nebula images are static assets rather than bundled — same reasoning, and
 * the same host resolution, as {@link module:lib/sky3d/hips}'s `HIPS_BASE_URL`:
 * native hits production directly, the web *build* is same-origin, and only
 * `expo start --web` needs the `/sky3d/*` proxy `metro.config.js` already sets up.
 */
const NEBULA_PROD_HOST = "https://www.vedicpatro.com";
const NEBULA_BASE_URL =
  Platform.OS === "web" && __DEV__
    ? "/sky3d/nebulae"
    : `${(Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(/\/api\/?$/, "") ?? NEBULA_PROD_HOST}/sky3d/nebulae`;

export const NEBULA_SOURCES: string[] = nebulaSources(NEBULA_BASE_URL);
