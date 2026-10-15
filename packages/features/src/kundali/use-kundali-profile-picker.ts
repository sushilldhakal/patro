/**
 * The kundali hub's saved-profile picker, shared by the website's and the
 * app's `components/kundali/KundaliProfilePicker.tsx`: the profiles query and
 * its loading / error / empty copy, one card per profile (birth date, place,
 * lat/long, timezone), and the add / edit dialog with what happens after a
 * save (refresh the list, then open the new or edited-selected profile).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "./use-profiles-query";

type DialogState = { mode: "add" } | { mode: "edit"; profile: Profile } | null;

const GENDER_LABEL: Record<string, string> = {
  male: "profile.male",
  female: "profile.female",
  other: "profile.other",
};

export function useKundaliProfilePicker({ selectedId, onSelect }: { selectedId?: string | null; onSelect: (profile: Profile) => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading, isError } = useProfilesQuery();
  const [dialog, setDialog] = useState<DialogState>(null);

  const card = (p: Profile) => {
    const active = p.id === selectedId;
    const dob = p.birth_date ? `${p.birth_date} ${(p.birth_era ?? "bs").toUpperCase()}` : "—";
    return {
      profile: p,
      id: p.id,
      name: p.full_name,
      isDefault: Boolean(p.is_default),
      active,
      gender: p.gender ? (GENDER_LABEL[p.gender] ? t(GENDER_LABEL[p.gender]!) : p.gender) : null,
      rows: {
        dob: { label: t("kundali.dob"), value: `${dob}${p.birth_time ? ` · ${p.birth_time}` : ""}` },
        place: { label: t("kundali.place"), value: p.location_label || p.city || "—" },
        latLon: {
          label: t("kundali.lat_long"),
          value: p.latitude != null && p.longitude != null ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : "—",
        },
        timezone: { label: t("kundali.timezone"), value: p.timezone || "—" },
      },
      viewLabel: active ? t("kundali.viewing_kundali") : t("kundali.view_kundali"),
      view: () => onSelect(p),
      edit: () => setDialog({ mode: "edit", profile: p }),
    };
  };

  return {
    status: isLoading && !profiles ? ("loading" as const) : isError ? ("error" as const) : ("ready" as const),
    loadingText: t("kundali.loading_profiles"),
    errorText: t("account_page.load_error"),
    empty: {
      title: t("kundali.no_profiles_yet"),
      hint: t("kundali.no_profiles_hint"),
      action: t("kundali.first_profile"),
    },
    editLabel: t("kundali.edit_profile"),
    cards: (profiles ?? []).map(card),
    openAdd: () => setDialog({ mode: "add" }),
    dialogOpen: dialog !== null,
    dialogTitle: dialog?.mode === "edit" ? t("kundali.edit_profile") : t("kundali.add_profile"),
    dialogHint: t("kundali.form_hint"),
    dialog: dialog
      ? {
          /** The profile being edited; undefined when adding. */
          existing: dialog.mode === "edit" ? dialog.profile : undefined,
          onSaved: async (saved: Profile) => {
            const wasEditingSelected = dialog.mode === "edit" && dialog.profile.id === selectedId;
            setDialog(null);
            await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
            if (dialog.mode === "add" || wasEditingSelected) onSelect(saved);
          },
        }
      : null,
    closeDialog: () => setDialog(null),
  };
}
