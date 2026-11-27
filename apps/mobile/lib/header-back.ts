import { Platform } from "react-native";

/** True in the app (iPhone, iPad, iPhone Duo, Android): the top bar carries the page's back key
 *  (PageBackBar), so pages drop their own in-page "← back" link. The website keeps the link. */
export function useHeaderHasBack(): boolean {
  return Platform.OS !== "web";
}
