/**
 * Account page logic, shared by the website (`apps/web/src/pages/Account.tsx`)
 * and the app (`apps/mobile/app/account/index.tsx`): whether a reader is
 * signed in, the verification banner and its resend, the saved profiles
 * (list, make default, delete, the add/edit form state), deleting the
 * account, and copy. Each app asks for confirmation in its own UI and adds
 * its own rows (the app's biometric lock and offline data).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiResendVerification,
  deleteProfile,
  updateProfile,
  PROFILES_QUERY_KEY,
  type Profile,
} from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { useProfilesQuery } from "../kundali";

export type AccountStatus = "loading" | "signed-out" | "ready";

export type AccountProfileRow = {
  profile: Profile;
  name: string;
  isDefault: boolean;
  /** Place and birth moment, or a "no birth details" note. */
  meta: string;
};

export function useAccountPage({
  auth,
  onProfileDeleted,
}: {
  auth: {
    user: { email: string; is_verified: boolean } | null | undefined;
    loading: boolean;
    refreshUser: () => Promise<unknown>;
    deleteAccount: () => Promise<unknown>;
  };
  /** Platform follow-up after a profile is removed (the app re-syncs its notifications). */
  onProfileDeleted?: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { user } = auth;
  const profilesQuery = useProfilesQuery(Boolean(user));
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const [resent, setResent] = useState(false);

  const status: AccountStatus = auth.loading ? "loading" : user ? "ready" : "signed-out";
  const reloadProfiles = () => void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });

  const profiles: AccountProfileRow[] = (profilesQuery.data ?? []).map((p) => ({
    profile: p,
    name: p.full_name,
    isDefault: Boolean(p.is_default),
    meta:
      [p.location_label || p.city, p.birth_date && `${p.birth_date}${p.birth_time ? ` ${p.birth_time}` : ""}`]
        .filter(Boolean)
        .join(" · ") || t("account_page.no_birth_details"),
  }));

  const listStatus: "editing" | "loading" | "empty" | "ready" =
    editing !== null ? "editing" : profilesQuery.isLoading ? "loading" : profiles.length === 0 ? "empty" : "ready";

  return {
    status,
    user,
    profiles,
    listStatus,
    loadError: profilesQuery.isError ? t("account_page.load_error") : null,
    editing,
    startNew: () => setEditing("new"),
    startEdit: (p: Profile) => setEditing(p),
    cancelEdit: () => setEditing(null),
    onProfileSaved: async () => {
      setEditing(null);
      reloadProfiles();
      await auth.refreshUser();
    },
    makeDefault: async (p: Profile) => {
      await updateProfile(p.id, { is_default: true });
      reloadProfiles();
    },
    /** Delete a profile; ask the reader first (`copy.deleteProfileConfirm`). */
    removeProfile: async (p: Profile) => {
      await deleteProfile(p.id);
      onProfileDeleted?.();
      reloadProfiles();
    },
    verification: {
      needed: Boolean(user && !user.is_verified),
      sent: resent,
      resend: async () => {
        await apiResendVerification();
        setResent(true);
      },
      label: resent ? t("account_page.resent") : t("account_page.resend"),
    },
    /** Delete the account; ask first (`copy.deleteAccountConfirm`). False when it failed (show `copy.deleteAccountError`). */
    deleteAccount: async () => {
      try {
        await auth.deleteAccount();
        return true;
      } catch {
        return false;
      }
    },
    copy: {
      title: t("account_page.title"),
      verifyEmail: t("account_page.verify_email"),
      profilesTitle: t("account_page.profiles_title"),
      addProfile: t("account_page.add_profile"),
      noProfiles: t("account_page.no_profiles"),
      defaultBadge: t("account_page.default"),
      makeDefault: t("account_page.make_default"),
      edit: t("account_page.edit"),
      delete: t("account_page.delete"),
      deleteProfileConfirm: t("account_page.delete_confirm"),
      deleteAccount: t("account_page.delete_account"),
      deleteAccountConfirm: t("account_page.delete_account_confirm"),
      deleteAccountError: t("account_page.delete_account_error"),
      cancel: t("common.cancel"),
    },
  };
}
