/**
 * The rashifal page's profile picker, shared by the website's and the app's
 * `components/rashifal/RashifalProfilePicker.tsx`: pick a saved profile to
 * narrow the grid to that person's janma rashi (the caller resolves it).
 */
import type { Profile } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { useSavedProfilePicker } from "../common/use-saved-profile-picker";

export function useRashifalProfilePicker(args: {
  isAuthenticated: boolean;
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
}) {
  const { t } = useLocale();
  return useSavedProfilePicker({
    ...args,
    copy: {
      label: t("rashifal.profile.label"),
      signIn: t("rashifal.profile.sign_in"),
      empty: t("rashifal.profile.no_profiles"),
      loading: t("rashifal.profile.loading"),
      none: t("rashifal.profile.all_signs"),
    },
  });
}
