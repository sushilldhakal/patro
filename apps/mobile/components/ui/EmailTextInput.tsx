import { TextInput, type TextInputProps } from "react-native";
import { EMAIL_TEXT_INPUT_PROPS } from "@/lib/email-text-input";

export function EmailTextInput(props: TextInputProps) {
  return <TextInput {...EMAIL_TEXT_INPUT_PROPS} {...props} />;
}
