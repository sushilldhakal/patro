/**
 * Kundali milan page logic, shared by the website
 * (`apps/web/src/pages/KundaliMilan.tsx`) and the app
 * (`apps/mobile/app/(tabs)/kundali-milan.tsx`): the sign-in gate, the two
 * chosen profiles, the ayanamsha, the ashtakuta match from the API, each
 * side's birth-details rows, and copy. Each app keeps its own profile picker.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchKundaliMilan,
  milanKeys,
  type MilanPerson,
  type MilanPersonQuery,
  type Profile,
} from "@vedic-patro/api-client";
import { getAyanamshaModeInfo } from "@vedic-patro/domain/ayanamsha";
import { formatProfileBirthLabel, profileChartParams } from "@vedic-patro/read-models/kundali/profile-chart";
import { useLocale } from "@vedic-patro/i18n/react";
import { useAuthDialog, type KundaliHubStatus } from "./use-kundali-hub-page";
import { useAyanamshaMode, type AyanamshaStorage } from "./use-kundali-detail-page";

export const MILAN_STALE_TIME = 1000 * 60 * 5;

export type MilanRole = "boy" | "girl";
export type MilanMatchStatus = "need-two" | "missing-birth" | "loading" | "error" | "ready";
export type MilanDetailsRow = { label: string; value: string };
export type MilanDetails = { role: MilanRole; heading: string; rows: MilanDetailsRow[] };

function formatDms(deg: number, positive: string, negative: string): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${d}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″ ${deg >= 0 ? positive : negative}`;
}

/** Birth query params (moment + place) for the milan endpoint, once a profile has a usable birth date. */
export function milanQueryFromProfile(profile: Profile | null): MilanPersonQuery | null {
  if (!profile) return null;
  const chart = profileChartParams(profile);
  if (!chart) return null;
  return {
    moment: chart.moment,
    lat: chart.location.params.lat,
    lon: chart.location.params.lon,
    timezone: chart.location.params.timezone,
  };
}

export function useKundaliMilanPage({
  isAuthenticated,
  authLoading,
  ayanamshaStorage,
}: {
  isAuthenticated: boolean;
  authLoading: boolean;
  /** Where the reader's ayanamsha choice is read from (the page does not write it back). */
  ayanamshaStorage: AyanamshaStorage;
}) {
  const { t, lang } = useLocale();
  const authDialog = useAuthDialog();
  const [ayanamsha, setAyanamsha] = useAyanamshaMode({ load: ayanamshaStorage.load }, "lahiri");
  const [boyProfile, setBoyProfile] = useState<Profile | null>(null);
  const [girlProfile, setGirlProfile] = useState<Profile | null>(null);
  const en = lang === "en";
  const milanLang = en ? "en" : "ne";

  const status: KundaliHubStatus = authLoading ? "loading" : isAuthenticated ? "ready" : "login";
  const boyQuery = milanQueryFromProfile(boyProfile);
  const girlQuery = milanQueryFromProfile(girlProfile);
  const bothChosen = isAuthenticated && !!boyProfile && !!girlProfile;
  const canMatch = bothChosen && !!boyQuery && !!girlQuery;

  // The full ashtakuta match — including each side's moon rashi/nakshatra —
  // is computed by the API from the two birth moments.
  const query = useQuery({
    queryKey: boyQuery && girlQuery ? milanKeys.match(boyQuery, girlQuery, ayanamsha, milanLang) : ["kundali", "milan", "idle"],
    queryFn: () => fetchKundaliMilan(boyQuery!, girlQuery!, { ayanamsha, lang: milanLang }),
    enabled: canMatch,
    staleTime: MILAN_STALE_TIME,
  });

  const matchStatus: MilanMatchStatus = !bothChosen
    ? "need-two"
    : !canMatch
      ? "missing-birth"
      : query.isLoading
        ? "loading"
        : query.isError || !query.data
          ? "error"
          : "ready";

  const ayanamshaInfo = getAyanamshaModeInfo(ayanamsha);
  const detailsFor = (role: MilanRole, profile: Profile, person?: MilanPerson): MilanDetails => {
    const chart = profileChartParams(profile);
    const rows: MilanDetailsRow[] = [
      { label: t("milan.name"), value: profile.full_name || "—" },
      { label: t("milan.date_of_birth"), value: formatProfileBirthLabel(profile, lang) },
      { label: t("milan.time_of_birth"), value: chart?.clock ?? profile.birth_time ?? "—" },
      { label: t("milan.city"), value: profile.city || profile.location_label?.split(",")[0] || "—" },
      { label: t("milan.region"), value: profile.location_label || "—" },
      { label: t("milan.country"), value: profile.country || "—" },
    ];
    if (profile.latitude != null) {
      rows.push({ label: t("milan.latitude"), value: `${formatDms(profile.latitude, "N", "S")} (${profile.latitude.toFixed(4)})` });
    }
    if (profile.longitude != null) {
      rows.push({ label: t("milan.longitude"), value: `${formatDms(profile.longitude, "E", "W")} (${profile.longitude.toFixed(4)})` });
    }
    rows.push({ label: t("milan.timezone"), value: profile.timezone || "—" });
    rows.push({
      label: t("milan.ayanamsha"),
      value: t("ui.kundali_milan.lang_chitrapaksha", { lang: en ? ayanamshaInfo.label : ayanamshaInfo.labelNe }),
    });
    if (person) {
      rows.push({ label: t("milan.moon_sign"), value: en ? person.moonRashiEn : person.moonRashiNe });
      rows.push({
        label: t("milan.nakshatra"),
        value: `${en ? person.nakshatraEn : person.nakshatraNe} (${person.nakshatraIndex + 1}) · ${t("milan.pada")} ${person.pada}`,
      });
      rows.push({ label: t("milan.lunar_longitude"), value: person.moonLongitude.toFixed(2) });
    }
    return { role, heading: role === "boy" ? t("milan.vara_details") : t("milan.kanya_details"), rows };
  };

  const milan = matchStatus === "ready" ? query.data : undefined;
  const details: MilanDetails[] =
    milan && boyProfile && girlProfile
      ? [detailsFor("boy", boyProfile, milan.boy), detailsFor("girl", girlProfile, milan.girl)]
      : [];

  return {
    status,
    authDialog,
    canAddProfile: isAuthenticated,
    boyProfile,
    girlProfile,
    setBoyProfile,
    setGirlProfile,
    ayanamsha,
    setAyanamsha,
    matchStatus,
    milan,
    details,
    copy: {
      eyebrow: t("milan.eyebrow"),
      title: t("milan.title"),
      subtitle: isAuthenticated ? t("milan.subtitle_auth") : t("milan.login_required"),
      addProfile: t("kundali.add_profile"),
      loading: t("common.loading"),
      loginTitle: t("milan.login_prompt_title"),
      loginBody: t("milan.login_prompt_body"),
      login: t("kundali.login"),
      signup: t("kundali.signup"),
      profileHint: t("milan.profile_hint"),
      missingBirth: t("milan.missing_birth"),
      error: t("milan.error"),
      needTwoProfiles: t("milan.need_two_profiles"),
      profileFormHint: t("milan.profile_form_hint"),
      noProfilesTitle: t("milan.no_profiles_title"),
      noProfilesBody: t("milan.no_profiles_body"),
      slot: { boy: t("milan.vara_slot"), girl: t("milan.kanya_slot") },
      pick: { boy: t("milan.pick_vara"), girl: t("milan.pick_kanya") },
      pickTitle: { boy: t("milan.pick_vara_title"), girl: t("milan.pick_kanya_title") },
    },
  };
}
