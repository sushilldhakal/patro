import Constants from "expo-constants";

/**
 * Social sign-in configuration (public values, safe in the bundle).
 *
 * - `googleWebClientId` is the same OAuth *Web* client ID the web app uses; the
 *   API verifies Google ID tokens against it. Native builds also need an iOS /
 *   Android OAuth client ID (created in the same Google Cloud project against
 *   bundle id `com.vedicpatro.mobile`) — set them in app.json → extra.
 * - `facebookAppId` is the same Meta app the web app uses.
 *
 * A button is shown only when its config is present, mirroring the web behaviour.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const googleWebClientId = extra.googleWebClientId || undefined;
export const googleIosClientId = extra.googleIosClientId || undefined;
export const googleAndroidClientId = extra.googleAndroidClientId || undefined;
export const facebookAppId = extra.facebookAppId || undefined;

export const googleSignInEnabled = Boolean(
  googleWebClientId || googleIosClientId || googleAndroidClientId,
);
export const facebookSignInEnabled = Boolean(facebookAppId);
