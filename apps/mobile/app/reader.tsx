import { useRef, useState, type ComponentType, type Ref } from "react";
import { Linking, Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView as RNWebView } from "react-native-webview";
import type { AndroidWebViewProps, IOSWebViewProps } from "react-native-webview/lib/WebViewTypes";
import { Sheet } from "@vedic-patro/ui";
import { __iconNode as XNode } from "lucide-react/dist/esm/icons/x";
import { __iconNode as LockNode } from "lucide-react/dist/esm/icons/lock";
import { __iconNode as EllipsisNode } from "lucide-react/dist/esm/icons/ellipsis";
import { __iconNode as RotateCwNode } from "lucide-react/dist/esm/icons/rotate-cw";
import { __iconNode as ShareNode } from "lucide-react/dist/esm/icons/share";
import { __iconNode as GlobeNode } from "lucide-react/dist/esm/icons/globe";
import {
  LucideNative,
  type LucideIconNode,
} from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

type WebHandle = { reload: () => void };
/** The package's props type also merges the Windows props, which collapses to `never` against React Native 0.88's types. */
const WebView = RNWebView as unknown as ComponentType<IOSWebViewProps & AndroidWebViewProps & { ref?: Ref<WebHandle> }>;

/**
 * An outside page (a news article) inside the app, the way Facebook opens links: close on the
 * left, the site's address and the page title in the middle, a menu on the right, and a thin
 * loading bar. Only http(s) pages load here; anything else goes to the system.
 */
export default function ReaderScreen() {
  const params = useLocalSearchParams<{ url?: string; source?: string }>();
  const start = String(params.url ?? "");
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const web = useRef<WebHandle>(null);
  const [page, setPage] = useState({ url: start, title: "", secure: start.startsWith("https:") });
  const [progress, setProgress] = useState(0);
  const [menu, setMenu] = useState(false);
  const host = hostOf(page.url);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const actions: { label: string; icon: LucideIconNode; run: () => void }[] = [
    { label: t("reader.reload"), icon: RotateCwNode, run: () => web.current?.reload() },
    { label: t("reader.share"), icon: ShareNode, run: () => void Share.share({ message: page.url, url: page.url }) },
    { label: t("reader.open_browser"), icon: GlobeNode, run: () => void Linking.openURL(page.url).catch(() => {}) },
  ];

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-background" style={{ paddingTop: insets.top }}>
        <View className="h-14 flex-row items-center gap-3 px-3">
          <RoundButton icon={XNode} label={t("common.close")} onPress={close} />
          <View className="flex-1 items-center">
            <View className="flex-row items-center gap-1">
              {page.secure ? (
                <LucideNative node={LockNode} size={13} color={colors.foreground} strokeWidth={2.4} />
              ) : null}
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {host}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {page.title || params.source || " "}
            </Text>
          </View>
          <RoundButton icon={EllipsisNode} label={t("reader.menu")} onPress={() => setMenu(true)} />
        </View>
        {progress > 0 && progress < 1 ? (
          <View className="h-0.5" style={{ width: `${progress * 100}%`, backgroundColor: colors.primary }} />
        ) : (
          <View className="h-0.5" />
        )}
      </View>
      {start.startsWith("http") ? (
        <WebView
          ref={web}
          source={{ uri: start }}
          style={{ flex: 1, backgroundColor: colors.background }}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onNavigationStateChange={(s) =>
            setPage({ url: s.url, title: s.title && s.title !== s.url ? s.title : "", secure: s.url.startsWith("https:") })
          }
          onShouldStartLoadWithRequest={(r) => {
            if (/^(https?|about|data|blob):/i.test(r.url)) return true;
            // tel:, mailto:, app links and the like belong to the system.
            void Linking.openURL(r.url).catch(() => {});
            return false;
          }}
        />
      ) : null}
      <Sheet open={menu} onClose={() => setMenu(false)} title={host} closeLabel={t("common.close")}>
        <View className="gap-1 pb-2">
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                setMenu(false);
                a.run();
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-2xl px-3 py-3.5 active:bg-muted"
            >
              <LucideNative node={a.icon} size={20} color={colors.foreground} strokeWidth={2} />
              <Text className="text-base text-foreground">{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: LucideIconNode; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="size-11 items-center justify-center rounded-full bg-muted active:opacity-70"
    >
      <LucideNative node={icon} size={22} color={colors.foreground} strokeWidth={2.2} />
    </Pressable>
  );
}

function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/([^/?#]+)/i.exec(url);
  return (m?.[1] ?? url).replace(/^www\./, "");
}
