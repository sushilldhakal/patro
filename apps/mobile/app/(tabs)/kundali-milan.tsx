import { useState } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { EMPTY_PROFILE, ProfileForm } from "@/components/auth/ProfileForm";
import { Sheet, Text as KitText } from "@vedic-patro/ui";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { type Profile } from "@/lib/auth/client";
import { getStoredAyanamshaMode } from "@/lib/kundali/ayanamsha-storage";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { useQueryClient } from "@tanstack/react-query";
import { KundaliMilanResult } from "@/components/kundali/KundaliMilanResult";
import { useKundaliMilanPage, type MilanDetails, type MilanRole } from "@vedic-patro/features/kundali";
import { space } from "@vedic-patro/design-tokens";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

const ayanamshaStorage = { load: getStoredAyanamshaMode };

export default function KundaliMilanScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const page = useKundaliMilanPage({ isAuthenticated, authLoading, ayanamshaStorage });
  const { status, authDialog, copy, boyProfile, girlProfile, matchStatus, milan } = page;
  const [addOpen, setAddOpen] = useState(false);
  const [pickRole, setPickRole] = useState<MilanRole | null>(null);

  return (
    <>
      <KundaliPageShell
        eyebrow={copy.eyebrow}
        icon={<AppNavIcon name="heart" size={28} color={colors.secondary} />}
        title={copy.title}
        subtitle={copy.subtitle}
        headerRight={
          page.canAddProfile ? (
            <Button
              label={copy.addProfile}
              size="sm"
              onPress={() => setAddOpen(true)}
            />
          ) : undefined
        }
      >
        {status === "loading" ? (
          <View className={cn(kundaliClasses.emptyBox, "items-center")}>
            <VedicPatroLoader size={72} />
          </View>
        ) : status === "login" ? (
          <KundaliLoginPrompt
            icon="heart-outline"
            title={copy.loginTitle}
            body={copy.loginBody}
            onLogin={authDialog.openLogin}
            onSignup={authDialog.openSignup}
          />
        ) : (
          <View className="gap-6">
            <Text className={kundaliClasses.profileHint} style={nepaliTextStyle(14)}>
              {copy.profileHint}
            </Text>

            <View className="gap-3 sm:flex-row">
              <MilanSlot
                role="boy"
                label={copy.slot.boy}
                pickLabel={copy.pick.boy}
                profile={boyProfile}
                onPress={() => setPickRole("boy")}
                onClear={() => page.setBoyProfile(null)}
              />
              <MilanSlot
                role="girl"
                label={copy.slot.girl}
                pickLabel={copy.pick.girl}
                profile={girlProfile}
                onPress={() => setPickRole("girl")}
                onClear={() => page.setGirlProfile(null)}
              />
            </View>

            {boyProfile && girlProfile ? (
              <>
                <AyanamshaSelector mode={page.ayanamsha} onModeChange={page.setAyanamsha} />
                {matchStatus === "missing-birth" ? (
                  <View className={cn(kundaliClasses.warnBox, "items-center")}>
                    <Text className={kundaliClasses.warnText} style={nepaliTextStyle(14)}>
                      {copy.missingBirth}
                    </Text>
                  </View>
                ) : matchStatus === "loading" ? (
                  <View className={cn(kundaliClasses.emptyBox, "items-center")}>
                    <VedicPatroLoader label={null} size={72} />
                    <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
                      {copy.loading}
                    </Text>
                  </View>
                ) : milan ? (
                  <View className="gap-6">
                    {page.details.map((details) => (
                      <BirthDetailsCard key={details.role} details={details} />
                    ))}
                    <KundaliMilanResult
                      boyName={boyProfile.full_name}
                      girlName={girlProfile.full_name}
                      result={milan.result}
                    />
                  </View>
                ) : (
                  <View className={cn(kundaliClasses.errorBox, "items-center")}>
                    <Text className={kundaliClasses.errorText} style={nepaliTextStyle(14)}>
                      {copy.error}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className={cn(kundaliClasses.emptyBoxShort, "items-center")}>
                <Text className={kundaliClasses.emptyText} style={nepaliTextStyle(14)}>
                  {copy.needTwoProfiles}
                </Text>
              </View>
            )}
          </View>
        )}
      </KundaliPageShell>

      <ProfilePickModal
        open={pickRole !== null}
        title={pickRole ? copy.pickTitle[pickRole] : ""}
        emptyLabel={copy.noProfilesTitle}
        onClose={() => setPickRole(null)}
        onPick={(profile) => {
          if (pickRole === "boy") page.setBoyProfile(profile);
          if (pickRole === "girl") page.setGirlProfile(profile);
          setPickRole(null);
        }}
      />

      <Sheet open={addOpen} title={copy.addProfile} onClose={() => setAddOpen(false)}>
        <KitText className="text-sm text-muted-foreground">{copy.profileFormHint}</KitText>
        <ProfileForm
          initial={EMPTY_PROFILE}
          onCancel={() => setAddOpen(false)}
          onSaved={async () => {
            setAddOpen(false);
            await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
          }}
        />
      </Sheet>

      <AuthDialog
        key={authDialog.mode}
        open={authDialog.open}
        onOpenChange={authDialog.setOpen}
        initialMode={authDialog.mode}
      />
    </>
  );
}

function BirthDetailsCard({ details }: { details: MilanDetails }) {
  return (
    <View className={kundaliClasses.detailsCard}>
      <View className={kundaliClasses.detailsHeader}>
        <Text className={kundaliClasses.detailsHeading} style={nepaliTextStyle(16)}>
          {details.heading}
        </Text>
      </View>
      {details.rows.map((row, i) => (
        <View key={row.label} className={cn("flex-row gap-3 px-4 py-2.5", i > 0 && "border-t border-border")}>
          <Text className="w-[40%] text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {row.label}
          </Text>
          <Text className="flex-1 text-base text-foreground" style={nepaliTextStyle(14)}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MilanSlot({
  role,
  label,
  pickLabel,
  profile,
  onPress,
  onClear,
}: {
  role: MilanRole;
  label: string;
  pickLabel: string;
  profile: Profile | null;
  onPress: () => void;
  onClear: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Card className="min-w-[280px] flex-1 gap-3 rounded-2xl">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={role === "boy" ? "man-outline" : "woman-outline"}
            size={20}
            color={colors.secondary}
          />
          <Text className={kundaliDetailClasses.milanPicker.slotLabel} style={nepaliTextStyle(16)}>
            {label}
          </Text>
        </View>
        {profile ? (
          <Pressable onPress={onClear} className="rounded-lg p-1 active:bg-muted">
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {profile ? (
        <Pressable onPress={onPress} className="gap-1 active:opacity-80">
          <Text className={kundaliDetailClasses.milanPicker.slotName} style={nepaliTextStyle(15)}>
            {profile.full_name}
          </Text>
          <Text className={kundaliDetailClasses.milanPicker.slotMeta} style={nepaliTextStyle(12)}>
            {profile.birth_date || "—"}
            {profile.birth_time ? ` · ${profile.birth_time}` : ""}
          </Text>
          <Text className={kundaliDetailClasses.milanPicker.slotMeta} style={nepaliTextStyle(12)}>
            {profile.location_label || profile.city || "—"}
          </Text>
        </Pressable>
      ) : (
        <Button label={pickLabel} variant="outline" onPress={onPress} />
      )}
    </Card>
  );
}

function ProfilePickModal({
  open,
  title,
  emptyLabel,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  emptyLabel: string;
  onClose: () => void;
  onPick: (profile: Profile) => void;
}) {
  const insets = useSafeAreaInsets();
  const { data: profiles, isLoading } = useProfilesQuery(open);
  const colors = useThemeColors();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="ml-3 text-base font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: Math.max(insets.bottom, space.lg) }}>
          {isLoading ? (
            <VedicPatroLoader label={null} size={56} className="py-6" />
          ) : (profiles ?? []).length === 0 ? (
            <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
              {emptyLabel}
            </Text>
          ) : (
            <View className="gap-2">
              {(profiles ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPick(p)}
                  className={cn("rounded-xl border border-border bg-card p-4 active:bg-muted")}
                >
                  <Text className={kundaliDetailClasses.milanPicker.pickName} style={nepaliTextStyle(16)}>
                    {p.full_name}
                  </Text>
                  <Text className={kundaliDetailClasses.milanPicker.pickMeta} style={nepaliTextStyle(12)}>
                    {p.birth_date || "—"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
