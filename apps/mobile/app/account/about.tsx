import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSiteFooter } from "@vedic-patro/features/common";
import { InnerPage, ListGroup, ListRow } from "@/components/account/AccountList";
import { Text } from "@/components/ui/Text";
import { runningBuildLine } from "@/lib/build-info";
import { useLocale } from "@/lib/i18n";

const ABOUT_ICON = { privacy: "lock", terms: "file-text", support: "mail", site: "globe" } as const;

/** Profile → About & legal: privacy, terms, support, the website, and the running build. */
export default function AboutScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const about = useSiteFooter();
  return (
    <InnerPage title={t("ui.settings.about_legal")}>
      <ListGroup>
        {about.map((link) => (
          <ListRow
            key={link.id}
            icon={ABOUT_ICON[link.id as keyof typeof ABOUT_ICON] ?? "globe"}
            title={link.label}
            onPress={link.kind === "page" ? () => router.push(link.path as never) : () => void Linking.openURL(link.url)}
          />
        ))}
      </ListGroup>
      {/* Version, for testers and support: where iOS Settings and most apps keep it. */}
      <Text className="text-center text-xs text-muted-foreground" selectable>
        {runningBuildLine()}
      </Text>
    </InnerPage>
  );
}
