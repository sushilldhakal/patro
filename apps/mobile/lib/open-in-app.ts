import { Linking, NativeModules, TurboModuleRegistry } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

/**
 * The installed build has react-native-webview. OTA updates also reach older builds without
 * it, and opening the reader there would crash, so those keep the system browser sheet.
 */
const HAS_WEBVIEW = !!(TurboModuleRegistry.get("RNCWebViewModule") ?? NativeModules.RNCWebViewModule);

/**
 * Opens a link inside the app (app/reader.tsx, our own header like Facebook's link view);
 * `source` (the outlet's name) shows under the address until the page's title loads.
 */
export function openInApp(url: string, source?: string): void {
  if (HAS_WEBVIEW && /^https?:/i.test(url)) {
    router.push({ pathname: "/reader", params: { url, ...(source ? { source } : {}) } });
    return;
  }
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    enableBarCollapsing: true,
  }).catch(() => Linking.openURL(url).catch(() => {}));
}
