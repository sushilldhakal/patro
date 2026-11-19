/**
 * Kundali profile page logic, shared by the website
 * (`apps/web/src/pages/KundaliDetail.tsx`) and the app
 * (`apps/mobile/app/(tabs)/kundali/[profileId].tsx`): which saved profile is
 * on screen and whether it can be charted, its birth facts, the ayanamsha
 * (remembered by the app's own storage), the edit dialog, and copy. Each app
 * passes its auth state, its profiles query and its ayanamsha storage; the
 * chart itself is read with `useKundaliChart`.
 */
import { useMemo, useState } from "react";
import type { Profile } from "@vedic-patro/api-client";
import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import { DEFAULT_AYANAMSHA, parseStoredAyanamsha } from "@vedic-patro/domain/calendar/calculation-system";
export { AYANAMSHA_STORAGE_KEY } from "@vedic-patro/domain/calendar/calculation-system";
import { formatProfileBirthLabel, profileBirthMoment, profileLocation } from "@vedic-patro/read-models/jyotish/kundali/profile-chart";
import { useCalculationSystem, useLocale } from "@vedic-patro/i18n/react";
import { useAuthDialog } from "./use-kundali-hub-page";

export const DEFAULT_AYANAMSHA_MODE: AyanamshaMode = DEFAULT_AYANAMSHA;

/** A stored value, or null when it is not one of the ayanamsha modes. */
export const parseAyanamshaMode = parseStoredAyanamsha;

/**
 * The reader's ayanamsha and its setter — one choice for the whole app (Account and the
 * kundali pages share it): every request carries it, so the panchanga, BS months,
 * festivals, साइत and the kundali all follow it under drik. Each app loads and saves it
 * at start-up (`configureAyanamshaPersistence`).
 */
export function useAyanamshaMode() {
  const { ayanamsha, setAyanamsha } = useCalculationSystem();
  return [ayanamsha, setAyanamsha] as const;
}

export type KundaliDetailStatus = "loading" | "login" | "not-found" | "no-birth" | "ready";

export type KundaliMetaItem = {
  key: "birthDate" | "time" | "place" | "timezone";
  label: string;
  value: string;
  mono?: boolean;
};

export function useKundaliDetailPage({
  profileId,
  auth,
  profiles,
  guestProfile,
}: {
  profileId: string | undefined;
  auth: { isAuthenticated: boolean; loading: boolean };
  /** The app's `useProfilesQuery` result. */
  profiles: { data?: Profile[]; isLoading: boolean; isError: boolean };
  /** A kundali kept on the device with no account (the app's `/kundali/guest`): `undefined` while it
   *  is read, `null` when there is none. Passing it opens the page without signing in. */
  guestProfile?: Profile | null;
}) {
  const { t, lang, digits } = useLocale();
  const [editOpen, setEditOpen] = useState(false);
  const [ayanamshaMode, setAyanamshaMode] = useAyanamshaMode();
  const authDialog = useAuthDialog();

  const guest = guestProfile !== undefined || profileId === "guest";
  const profile = useMemo(
    () => (guest ? (guestProfile ?? undefined) : profiles.data?.find((p) => p.id === profileId)),
    [guest, guestProfile, profiles.data, profileId],
  );
  const moment = useMemo(() => (profile ? profileBirthMoment(profile) : null), [profile]);
  const location = useMemo(() => (profile ? profileLocation(profile) : null), [profile]);

  const profilesPending = auth.isAuthenticated && profiles.isLoading && !profiles.data;
  const status: KundaliDetailStatus = guest
    ? guestProfile === undefined
      ? "loading"
      : !profile
        ? "not-found"
        : !moment || !location
          ? "no-birth"
          : "ready"
    : auth.loading || profilesPending
      ? "loading"
      : !auth.isAuthenticated
        ? "login"
        : profiles.isError || !profile
          ? "not-found"
          : !moment || !location
            ? "no-birth"
            : "ready";

  const meta: KundaliMetaItem[] = profile
    ? [
        { key: "birthDate", label: t("kundali.birth_date"), value: formatProfileBirthLabel(profile, lang, digits) },
        { key: "time", label: t("kundali.time"), value: profile.birth_time ? digits(profile.birth_time) : "—", mono: true },
        { key: "place", label: t("kundali.place"), value: profile.location_label || profile.city || "—" },
        { key: "timezone", label: t("kundali.timezone"), value: profile.timezone || "—", mono: true },
      ]
    : [];

  return {
    status,
    profile,
    moment,
    location,
    meta,
    ayanamshaMode,
    setAyanamshaMode,
    edit: { open: editOpen, setOpen: setEditOpen },
    authDialog,
    copy: {
      loading: t("common.loading"),
      backAll: t("kundali.back_all"),
      otherKundali: t("kundali.other_kundali"),
      editProfile: t("kundali.edit_profile"),
      editHint: t("kundali.generate_hint"),
      eyebrow: t("kundali.title"),
      loginRequired: t("kundali.login_required"),
      loginTitle: t("kundali.login_view_title"),
      login: t("kundali.login"),
      signup: t("kundali.signup"),
      notFound: t("kundali.not_found"),
      notFoundBody: t("kundali.not_found_body"),
      noBirthTitle: t("kundali.no_birth_title"),
      noBirthBody: t("kundali.no_birth_body"),
      computing: t("kundali.computing"),
      loadError: t("kundali.load_error"),
      cancel: t("common.cancel"),
    },
  };
}
