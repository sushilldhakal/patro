import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVerifyEmailPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { StandaloneChrome } from "@/components/StandaloneChrome";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

/** Confirm an email address — the app's drawing of `useVerifyEmailPage` (@vedic-patro/features). */
function VerifyEmailScreenBody() {
  const colors = useThemeColors();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const page = useVerifyEmailPage(token, refreshUser);

  return (
    <AppShell title={page.copy.okTitle} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panelCentered)}>
        {page.status === "loading" ? (
          <VedicPatroLoader />
        ) : page.status === "ok" ? (
          <>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {page.copy.okTitle}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {page.copy.okBody}
            </Text>
            <Button label={page.copy.goToAccount} className={accountClasses.statusAction} onPress={() => router.replace("/account" as never)} />
          </>
        ) : (
          <>
            <Ionicons name="close-circle" size={48} color={colors.destructive} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {page.copy.failTitle}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {page.copy.failBody}
            </Text>
            <Button label={page.copy.backToAccount} variant="outline" className={accountClasses.statusAction} onPress={() => router.replace("/account" as never)} />
          </>
        )}
      </View>
    </AppShell>
  );
}

export default function VerifyEmailScreen() {
  return (
    <StandaloneChrome>
      <VerifyEmailScreenBody />
    </StandaloneChrome>
  );
}
