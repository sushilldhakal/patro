/**
 * Kundali profile page logic, shared by the website
 * (`apps/web/src/pages/KundaliDetail.tsx`) and the app
 * (`apps/mobile/app/(tabs)/kundali/[profileId].tsx`): which saved profile is
 * on screen and whether it can be charted, its birth facts, the ayanamsha
 * (remembered by the app's own storage), the edit dialog, and copy. Each app
 * passes its auth state, its profiles query and its ayanamsha storage; the
 * chart itself is read with `useKundaliChart`.
 */
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@vedic-patro/api-client";
import { AYANAMSHA_MODES, type AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { formatProfileBirthLabel, profileBirthMoment, profileLocation } from "@vedic-patro/domain/kundali/profile-chart";
import { useLocale } from "@vedic-patro/i18n/react";
import { useAuthDialog } from "./use-kundali-hub-page";

export const DEFAULT_AYANAMSHA_MODE: AyanamshaMode = "nepal";
export const AYANAMSHA_STORAGE_KEY = "dhakalPatroAyanamshaMode";

/** A stored value, or null when it is not one of the ayanamsha modes. */
export function parseAyanamshaMode(raw: string | null | undefined): AyanamshaMode | null {
  return raw && AYANAMSHA_MODES.some((m) => m.id === raw) ? (raw as AyanamshaMode) : null;
}

/** Where the app keeps the reader's ayanamsha choice (sync on the web, async in the app). */
export type AyanamshaStorage = {
  load: () => AyanamshaMode | null | Promise<AyanamshaMode | null>;
  /** Omit to keep a change for this visit only. */
  save?: (mode: AyanamshaMode) => void | Promise<void>;
};

/** The ayanamsha mode, read once from storage and written back on change. */
export function useAyanamshaMode(storage: AyanamshaStorage, fallback: AyanamshaMode = DEFAULT_AYANAMSHA_MODE) {
  const [mode, setModeState] = useState<AyanamshaMode>(() => {
    const saved = storage.load();
    return saved instanceof Promise ? fallback : (saved ?? fallback);
  });
  useEffect(() => {
    const saved = storage.load();
    if (!(saved instanceof Promise)) return;
    let live = true;
    void saved.then((value) => {
      if (live && value) setModeState(value);
    });
    return () => {
      live = false;
    };
    // Read once on mount; later changes are written by `setMode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setMode = (next: AyanamshaMode) => {
    setModeState(next);
    void storage.save?.(next);
  };
  return [mode, setMode] as const;
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
  ayanamshaStorage,
}: {
  profileId: string | undefined;
  auth: { isAuthenticated: boolean; loading: boolean };
  /** The app's `useProfilesQuery` result. */
  profiles: { data?: Profile[]; isLoading: boolean; isError: boolean };
  ayanamshaStorage: AyanamshaStorage;
}) {
  const { t, lang, digits } = useLocale();
  const [editOpen, setEditOpen] = useState(false);
  const [ayanamshaMode, setAyanamshaMode] = useAyanamshaMode(ayanamshaStorage);
  const authDialog = useAuthDialog();

  const profile = useMemo(() => profiles.data?.find((p) => p.id === profileId), [profiles.data, profileId]);
  const moment = useMemo(() => (profile ? profileBirthMoment(profile) : null), [profile]);
  const location = useMemo(() => (profile ? profileLocation(profile) : null), [profile]);

  const profilesPending = auth.isAuthenticated && profiles.isLoading && !profiles.data;
  const status: KundaliDetailStatus =
    auth.loading || profilesPending
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
