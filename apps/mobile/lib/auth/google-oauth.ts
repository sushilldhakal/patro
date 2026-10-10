import Constants, { ExecutionEnvironment } from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import {
  googleAndroidClientId,
  googleIosClientId,
  googleWebClientId,
} from "@/lib/auth/oauth-config";

/** `1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`. */
export function reversedGoogleClientScheme(clientId: string | undefined): string | undefined {
  if (!clientId) return undefined;
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return undefined;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

/**
 * Custom-scheme redirect Google receives on native builds.
 *
 * Use the app scheme (registered in Info.plist), not the reversed iOS client
 * scheme. The ID token is requested with the *Web* client so production
 * `POST /auth/google` can verify `aud` against GOOGLE_CLIENT_ID. The reversed
 * iOS scheme mints a token the API rejects unless GOOGLE_IOS_CLIENT_ID is set.
 */
export function getGoogleNativeRedirectUri(): string {
  return "vedicpatro://oauthredirect";
}

/** Redirect URI sent to Google — must be registered on the matching OAuth client. */
export function getGoogleRedirectUri(): string {
  return makeRedirectUri({
    scheme: "vedicpatro",
    path: "oauthredirect",
    native: getGoogleNativeRedirectUri(),
    preferLocalhost: Platform.OS === "web",
  });
}

/** URIs to add under Web OAuth client → Authorized redirect URIs (copy/paste checklist). */
export function listGoogleWebClientRedirectUris(): string[] {
  const uris = new Set<string>([getGoogleRedirectUri(), getGoogleNativeRedirectUri()]);
  uris.add("http://localhost:8081/oauthredirect");
  uris.add("http://localhost:19006/oauthredirect");
  uris.add("vedicpatro:/oauthredirect");
  uris.add("vedicpatro://oauthredirect");
  const reversed = reversedGoogleClientScheme(googleIosClientId);
  if (reversed) uris.add(`${reversed}:/oauthredirect`);
  return [...uris].filter(Boolean).sort();
}

/**
 * Auth-session config. Native uses the Web client ID on purpose so the ID
 * token audience matches the API. Do not pass iosClientId/androidClientId here
 * — expo-auth-session would switch client and mint a token the API rejects.
 */
export function getGoogleClientIds() {
  return {
    clientId: googleWebClientId,
    redirectUri: getGoogleRedirectUri(),
    selectAccount: true,
  };
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Google sign-in is available on web and on dev/production native builds when configured. */
export function isGoogleSignInConfiguredForPlatform(): boolean {
  if (isExpoGo()) {
    return false;
  }
  if (Platform.OS === "web") {
    return Boolean(googleWebClientId);
  }
  if (Platform.OS === "ios") {
    return Boolean(googleIosClientId || googleWebClientId);
  }
  if (Platform.OS === "android") {
    return Boolean(googleAndroidClientId || googleWebClientId);
  }
  return false;
}

export function googleSignInSetupMessage(): string {
  const redirectUri = getGoogleRedirectUri();
  const redirectChecklist = listGoogleWebClientRedirectUris().join("\n  • ");

  if (isExpoGo()) {
    return (
      "Google sign-in does not work in Expo Go (redirect_uri_mismatch). " +
      "Use a development build instead: npx expo run:ios or npx expo run:android, " +
      "then add iOS/Android OAuth clients in Google Cloud Console for com.vedicpatro.mobile."
    );
  }

  if (Platform.OS === "web") {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
    return (
      `Google redirect URI mismatch. In Google Cloud Console → Credentials → Web OAuth client ` +
      `(…${googleWebClientId?.slice(-20) ?? "your-client"}), add:\n\n` +
      `Authorized JavaScript origins:\n  • ${origin}\n\n` +
      `Authorized redirect URIs (add every line that applies):\n  • ${redirectChecklist}\n\n` +
      `This app is currently using: ${redirectUri}`
    );
  }

  return (
    `Google redirect URI mismatch. In Google Cloud Console → Credentials → Web OAuth client ` +
    `(…${googleWebClientId?.slice(-20) ?? "your-client"}), add:\n\n` +
    `Authorized redirect URIs:\n  • ${redirectChecklist}\n\n` +
    `This app is currently using: ${redirectUri}`
  );
}
