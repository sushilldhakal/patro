import Constants, { ExecutionEnvironment } from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import {
  googleAndroidClientId,
  googleIosClientId,
  googleNativeServerClientId,
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
 * Google only accepts a custom scheme on a *native* OAuth client (a Web client
 * rejects it with invalid_request), so native builds sign in with the iOS /
 * Android client. The API accepts their ID tokens via GOOGLE_IOS_CLIENT_ID /
 * GOOGLE_ANDROID_CLIENT_ID.
 *
 * iOS: the reversed iOS client ID (registered by app.config.js).
 * Android: the package name (registered via `scheme` in app.json).
 */
export function getGoogleNativeRedirectUri(): string {
  const reversed = reversedGoogleClientScheme(googleIosClientId);
  if (Platform.OS === "ios" && reversed) return `${reversed}:/oauthredirect`;
  return "com.vedicpatro.mobile:/oauthredirect";
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

/** URIs to add under Web OAuth client → Authorized redirect URIs (web build only). */
export function listGoogleWebClientRedirectUris(): string[] {
  const uris = new Set<string>([getGoogleRedirectUri()]);
  uris.add("http://localhost:8081/oauthredirect");
  uris.add("http://localhost:19006/oauthredirect");
  return [...uris].filter((uri) => uri.startsWith("http")).sort();
}

/**
 * Auth-session config. Native uses the platform client (iOS / Android) with a
 * PKCE code flow — the code is exchanged in SocialSignInButtons for an ID
 * token whose `aud` is that platform client. Web keeps the implicit id_token
 * flow on the Web client.
 */
export function getGoogleClientIds() {
  return {
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
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
    return Boolean(googleIosClientId);
  }
  if (Platform.OS === "android") {
    return Boolean(googleAndroidClientId && googleNativeServerClientId);
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

  const nativeClient = Platform.OS === "ios" ? "iOS" : "Android";
  return (
    `Google sign-in is not set up for this build. In Google Cloud Console → Credentials, ` +
    `the ${nativeClient} OAuth client must use package / bundle ID com.vedicpatro.mobile` +
    (Platform.OS === "android"
      ? ` and this build's signing SHA-1 (one Android client per SHA-1).`
      : `.`) +
    `\n\nThis app is currently using: ${redirectUri}`
  );
}
