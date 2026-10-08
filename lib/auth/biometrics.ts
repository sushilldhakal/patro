import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricKind = "face" | "fingerprint" | "generic";

export interface BiometricInfo {
  /** Hardware present AND at least one face/fingerprint enrolled. */
  available: boolean;
  kind: BiometricKind;
}

export async function getBiometricInfo(): Promise<BiometricInfo> {
  if (Platform.OS === "web") return { available: false, kind: "generic" };
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const kind: BiometricKind = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? "face"
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? "fingerprint"
        : "generic";
    return { available: hasHardware && enrolled, kind };
  } catch {
    return { available: false, kind: "generic" };
  }
}

/** Prompt Face ID / Touch ID / fingerprint, falling back to the device passcode. */
export async function authenticateBiometric(promptMessage: string, cancelLabel: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export function biometricLabel(kind: BiometricKind, platform: string = Platform.OS): string {
  if (kind === "face") return platform === "ios" ? "Face ID" : "Face unlock";
  if (kind === "fingerprint") return platform === "ios" ? "Touch ID" : "Fingerprint";
  return platform === "ios" ? "Face ID / Touch ID" : "Biometrics";
}
