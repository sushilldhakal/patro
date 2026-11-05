import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { useAccountPage } from "@vedic-patro/features/account";
import { ListGroup, ListRow } from "@/components/account/AccountList";
import { InnerPage } from "@/components/account/AccountList";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterProfileDeleted } from "@/lib/notifications/triggers";

/** Profile → Account data: where deleting the account lives, out of the way of the main list. */
export default function AccountDataScreen() {
  const { t, lang } = useLocale();
  const router = useRouter();
  const auth = useAuth();
  const page = useAccountPage({ auth, onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne") });
  const { copy } = page;
  return (
    <InnerPage title={t("ui.account.account_data")}>
      <View className="gap-2">
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
          {t("ui.account.account_data_body")}
        </Text>
        <ListGroup>
          <ListRow
            icon="trash"
            title={copy.deleteAccount}
            tone="danger"
            onPress={() =>
              Alert.alert(copy.deleteAccount, copy.deleteAccountConfirm, [
                { text: copy.cancel, style: "cancel" },
                {
                  text: copy.delete,
                  style: "destructive",
                  onPress: async () => {
                    if (await page.deleteAccount()) router.replace("/" as never);
                    else Alert.alert(copy.deleteAccountError);
                  },
                },
              ])
            }
          />
        </ListGroup>
      </View>
    </InnerPage>
  );
}
