/**
 * The sait page's profile picker, shared by the website's and the app's
 * `components/sait/SaitProfilePicker.tsx`: pick a saved profile so the sait
 * dates get a native (birth-chart) verdict.
 */
import type { Profile } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { useSavedProfilePicker } from "../common/use-saved-profile-picker";

export function useSaitProfilePicker(args: {
  isAuthenticated: boolean;
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
}) {
  const { t } = useLocale();
  const picker = useSavedProfilePicker({
    ...args,
    copy: {
      label: t("sait.personalise"),
      signIn: t("sait.sign_in_to_pick_your_profile"),
      empty: t("sait.no_saved_profiles_add_one_in_your_account"),
      loading: t("sait.loading"),
      none: t("sait.general_no_profile"),
    },
  });
  /** Heading of the app's option sheet. */
  return { ...picker, sheetTitle: t("ui.sait.choose_a_profile") };
}
