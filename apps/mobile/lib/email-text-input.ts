import type { TextInputProps } from "react-native";

/** Props that show the email keyboard (@ and .com shortcuts) on iOS, Android, and web. */
export const EMAIL_TEXT_INPUT_PROPS: Pick<
  TextInputProps,
  | "keyboardType"
  | "autoCapitalize"
  | "autoCorrect"
  | "autoComplete"
  | "textContentType"
  | "inputMode"
  | "importantForAutofill"
> = {
  keyboardType: "email-address",
  autoCapitalize: "none",
  autoCorrect: false,
  autoComplete: "email",
  textContentType: "emailAddress",
  inputMode: "email",
  importantForAutofill: "yes",
};
