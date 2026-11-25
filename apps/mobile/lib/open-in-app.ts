import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

/** Opens a link in the in-app browser (Safari View / Custom Tabs) so the user stays in the app. */
export function openInApp(url: string): void {
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    enableBarCollapsing: true,
  }).catch(() => Linking.openURL(url).catch(() => {}));
}
