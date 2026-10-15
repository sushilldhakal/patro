import type { SignInResponse } from "@react-native-google-signin/google-signin";
import { googleNativeServerClientId } from "@/lib/auth/oauth-config";

/**
 * Android Google sign-in through Google Play services (Credential Manager).
 *
 * Google no longer allows custom-scheme redirects on new Android OAuth
 * clients, so the browser flow cannot work there. The native SDK matches the
 * app's package + signing SHA-1 against the Android client and returns an ID
 * token whose `aud` is `googleNativeServerClientId` — the Web client in the
 * *same* Google Cloud project — which the API accepts via GOOGLE_CLIENT_IDS.
 *
 * Resolves the ID token, or null when the user cancelled.
 *
 * The SDK is a native module, loaded only here: a top-level import throws in
 * any binary without it (Expo Go, an older dev client) and took down every
 * route that renders the sign-in buttons.
 */
export async function signInWithGoogleNative(): Promise<string | null> {
  if (!googleNativeServerClientId) throw new Error("Google sign-in is not configured");
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, isSuccessResponse, statusCodes } =
    await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId: googleNativeServerClientId });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker rather than reusing the last account.
    await GoogleSignin.signOut().catch(() => undefined);
    // Typecheck resolves the package's `.web` declarations; native returns SignInResponse.
    const response = (await GoogleSignin.signIn()) as unknown as SignInResponse;
    if (isCancelledResponse(response)) return null;
    if (isSuccessResponse(response) && response.data.idToken) return response.data.idToken;
    throw new Error("Google did not return an ID token");
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return null;
    // DEVELOPER_ERROR here means the Android client's package / SHA-1 does not
    // match this build's signing key.
    console.warn("[Google Sign-In] native error:", err);
    throw err;
  }
}
