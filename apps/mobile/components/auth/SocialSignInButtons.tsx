import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { exchangeCodeAsync, ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as AppleAuthentication from "expo-apple-authentication";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { signInWithGoogleNative } from "@/lib/auth/google-native";
import {
  getGoogleClientIds,
  googleSignInSetupMessage,
  isGoogleSignInConfiguredForPlatform,
} from "@/lib/auth/google-oauth";
import {
  facebookAppId,
  facebookSignInEnabled,
  googleSignInEnabled,
} from "@/lib/auth/oauth-config";

import { illustration, space } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";
WebBrowser.maybeCompleteAuthSession();

type Props = {
  onGoogle: (idToken: string) => void;
  onFacebook: (accessToken: string) => void;
  onApple?: (identityToken: string, email?: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function SocialSignInButtons({ onGoogle, onFacebook, onApple, onError, disabled }: Props) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const [busy, setBusy] = useState<"google" | "facebook" | "apple" | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const googleClientIds = getGoogleClientIds();
  const googleConfigured = isGoogleSignInConfiguredForPlatform();

  const [googleRequest, googleResponse, googlePrompt] = Google.useAuthRequest({
    ...googleClientIds,
    // Web: implicit id_token on the Web client. Native: PKCE code on the
    // iOS / Android client (Google rejects implicit + custom scheme there),
    // exchanged below so failures surface instead of hanging.
    ...(Platform.OS === "web"
      ? { responseType: ResponseType.IdToken }
      : { responseType: ResponseType.Code, shouldAutoExchangeCode: false }),
  });

  const [fbRequest, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: facebookAppId ?? "",
    scopes: ["public_profile", "email"],
  });

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (!__DEV__ || !googleSignInEnabled) return;
    console.info("[Google OAuth] redirect URI:", googleClientIds.redirectUri);
    console.info("[Google OAuth] client ID:", googleRequest?.clientId);
    console.info("[Google OAuth] platform:", Platform.OS);
  }, [googleClientIds.redirectUri, googleRequest?.clientId]);

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const idToken =
        googleResponse.params?.id_token ?? googleResponse.authentication?.idToken;
      const code = googleResponse.params?.code;
      if (idToken) {
        onGoogle(idToken);
      } else if (code && googleRequest) {
        exchangeCodeAsync(
          {
            clientId: googleRequest.clientId,
            redirectUri: googleRequest.redirectUri,
            code,
            extraParams: { code_verifier: googleRequest.codeVerifier ?? "" },
          },
          Google.discovery,
        )
          .then((tokens) => {
            if (tokens.idToken) onGoogle(tokens.idToken);
            else onError?.(pick("गुगल लग-इन असफल", "Google sign-in failed"));
          })
          .catch((err) => {
            console.warn("[Google OAuth] code exchange failed:", err);
            onError?.(pick("गुगल लग-इन असफल", "Google sign-in failed"));
          })
          .finally(() => setBusy(null));
        return;
      } else {
        onError?.(pick("गुगल लग-इन असफल", "Google sign-in failed"));
      }
    } else if (googleResponse.type === "error") {
      const err = String(googleResponse.error ?? googleResponse.errorCode ?? "");
      console.warn("[Google OAuth] error:", err, googleResponse.params);
      if (/redirect_uri_mismatch/i.test(err) || /invalid_request/i.test(err)) {
        onError?.(googleSignInSetupMessage());
      } else {
        onError?.(err || pick("गुगल लग-इन असफल", "Google sign-in failed"));
      }
    }
    if (googleResponse.type !== "success") setBusy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  useEffect(() => {
    if (!fbResponse) return;
    if (fbResponse.type === "success") {
      const token =
        fbResponse.authentication?.accessToken ?? fbResponse.params?.access_token;
      if (token) onFacebook(token);
      else onError?.(pick("फेसबुक लग-इन असफल", "Facebook sign-in failed"));
    } else if (fbResponse.type === "error") {
      onError?.(pick("फेसबुक लग-इन असफल", "Facebook sign-in failed"));
    }
    if (fbResponse.type !== "success") setBusy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbResponse]);

  // Android uses the native SDK (Google blocks browser redirects to new Android clients).
  const useNativeGoogle = Platform.OS === "android";
  const googleReady = useNativeGoogle || Boolean(googleRequest);
  const showGoogle = googleSignInEnabled && googleConfigured;
  const showGoogleSetupHint = googleSignInEnabled && !googleConfigured;
  const showApple = appleAvailable && Boolean(onApple);

  async function onApplePress() {
    if (!onApple) return;
    setBusy("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError?.(pick("एपल लग-इन असफल", "Apple sign-in failed"));
        return;
      }
      onApple(credential.identityToken, credential.email);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "ERR_REQUEST_CANCELED") {
        onError?.(pick("एपल लग-इन असफल", "Apple sign-in failed"));
      }
    } finally {
      setBusy(null);
    }
  }

  if (!showGoogle && !showGoogleSetupHint && !facebookSignInEnabled && !showApple) return null;

  return (
    <View className={accountClasses.socialStack}>
      {showGoogleSetupHint ? (
        <Text className="text-xs leading-relaxed text-muted-foreground">
          {googleSignInSetupMessage()}
        </Text>
      ) : null}

      {showApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={22}
          style={{ width: "100%", height: space["4xl"] }}
          onPress={() => {
            if (disabled || busy !== null) return;
            void onApplePress();
          }}
        />
      ) : null}

      {showGoogle ? (
        <Pressable
          disabled={disabled || !googleReady || busy !== null}
          onPress={() => {
            setBusy("google");
            if (useNativeGoogle) {
              signInWithGoogleNative()
                .then((idToken) => {
                  if (idToken) onGoogle(idToken);
                })
                .catch(() => onError?.(googleSignInSetupMessage()))
                .finally(() => setBusy(null));
              return;
            }
            googlePrompt().catch(() => {
              onError?.(googleSignInSetupMessage());
              setBusy(null);
            });
          }}
          className={cn(accountClasses.socialButton, "w-full max-w-xs flex-row items-center justify-center self-center active:bg-muted")}
          style={disabled || !googleReady ? { opacity: 0.5 } : undefined}
        >
          {busy === "google" ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Ionicons name="logo-google" size={18} color={illustration.red56} />
          )}
          <Text className={accountClasses.socialButtonText}>
            {pick("गुगलबाट जारी राख्नुहोस्", "Continue with Google")}
          </Text>
        </Pressable>
      ) : null}

      {facebookSignInEnabled ? (
        <Pressable
          disabled={disabled || !fbRequest || busy !== null}
          onPress={() => {
            setBusy("facebook");
            fbPrompt().catch(() => {
              onError?.(pick("फेसबुक लग-इन असफल", "Facebook sign-in failed"));
              setBusy(null);
            });
          }}
          className={cn(accountClasses.socialButton, "w-full max-w-xs flex-row items-center justify-center self-center active:bg-muted")}
          style={disabled || !fbRequest ? { opacity: 0.5 } : undefined}
        >
          {busy === "facebook" ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Ionicons name="logo-facebook" size={18} color={illustration.sky52} />
          )}
          <Text className={accountClasses.socialButtonText}>
            {pick("फेसबुकबाट जारी राख्नुहोस्", "Continue with Facebook")}
          </Text>
        </Pressable>
      ) : null}

      {showGoogle || facebookSignInEnabled || showApple ? (
        <View className={cn("flex-row", accountClasses.socialDividerRow)}>
          <View className={accountClasses.socialDividerLine} />
          <Text className={accountClasses.socialDividerText}>{pick("वा", "or")}</Text>
          <View className={accountClasses.socialDividerLine} />
        </View>
      ) : null}
    </View>
  );
}
