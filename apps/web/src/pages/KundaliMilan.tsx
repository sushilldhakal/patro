import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Heart, LogIn, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import {
  MilanProfilePicker,
  type MilanProfilePickerHandle,
} from "@/components/kundali/MilanProfilePicker";
import { KundaliMilanResult } from "@/components/kundali/KundaliMilanResult";
import { PageShell } from "@/components/PageShell";
import { AYANAMSHA_MODES, getAyanamshaModeInfo, type AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { formatProfileBirthLabel, profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { useLocale } from "@/i18n/locale";
import {
  fetchKundaliMilan,
  milanKeys,
  type MilanPerson,
  type MilanPersonQuery,
} from "@/lib/api";
import type { Profile } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useRouteLoading } from "@/lib/route-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
const AYANAMSHA_KEY = "dhakalPatroAyanamshaMode";

function loadSavedAyanamshaMode(): AyanamshaMode {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(AYANAMSHA_KEY) : null;
  return AYANAMSHA_MODES.some((m) => m.id === saved) ? (saved as AyanamshaMode) : "lahiri";
}

function ayanamshaLabel(mode: AyanamshaMode, lang?: string): string {
  const info = getAyanamshaModeInfo(mode);
  return (lang ?? "ne").startsWith("en") ? info.label : info.labelNe;
}

function formatDms(deg: number): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  const hemi = deg >= 0 ? "N" : "S";
  return `${d}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″ ${hemi}`;
}

function formatLonDms(deg: number): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  const hemi = deg >= 0 ? "E" : "W";
  return `${d}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″ ${hemi}`;
}

/** Birth query params (datetime + place) for the milan endpoint. */
function milanQueryFromProfile(profile: Profile): MilanPersonQuery | null {
  const chart = profileChartParams(profile);
  if (!chart) return null;
  return {
    moment: chart.moment,
    lat: chart.location.params.lat,
    lon: chart.location.params.lon,
    timezone: chart.location.params.timezone,
  };
}

interface BirthDetailsTableProps {
  role: "boy" | "girl";
  profile: Profile;
  person?: MilanPerson;
  ayanamsha: AyanamshaMode;
  lang: string;
}

function BirthDetailsTable({ role, profile, person, ayanamsha, lang }: BirthDetailsTableProps) {
  const { t } = useTranslation();
  const en = lang.startsWith("en");
  const chart = profileChartParams(profile);

  const rows: { label: string; value: string }[] = [
    { label: t("milan.name"), value: profile.full_name || "—" },
    {
      label: t("milan.date_of_birth"),
      value: formatProfileBirthLabel(profile, lang),
    },
    { label: t("milan.time_of_birth"), value: chart?.clock ?? profile.birth_time ?? "—" },
    { label: t("milan.city"), value: profile.city || profile.location_label?.split(",")[0] || "—" },
    { label: t("milan.region"), value: profile.location_label || "—" },
    { label: t("milan.country"), value: profile.country || "—" },
  ];

  if (profile.latitude != null) {
    rows.push({
      label: t("milan.latitude"),
      value: `${formatDms(profile.latitude)} (${profile.latitude.toFixed(4)})`,
    });
  }
  if (profile.longitude != null) {
    rows.push({
      label: t("milan.longitude"),
      value: `${formatLonDms(profile.longitude)} (${profile.longitude.toFixed(4)})`,
    });
  }
  rows.push({ label: t("milan.timezone"), value: profile.timezone || "—" });
  rows.push({
    label: t("milan.ayanamsha"),
    value: tFor((en) ? "en" : "ne", "ui.kundali_milan.lang_chitrapaksha", { lang: ayanamshaLabel(ayanamsha, lang) }),
  });

  if (person) {
    rows.push({
      label: t("milan.moon_sign"),
      value: en ? person.moonRashiEn : person.moonRashiNe,
    });
    rows.push({
      label: t("milan.nakshatra"),
      value: `${en ? person.nakshatraEn : person.nakshatraNe} (${person.nakshatraIndex + 1}) · ${t("milan.pada")} ${person.pada}`,
    });
    rows.push({ label: t("milan.lunar_longitude"), value: person.moonLongitude.toFixed(2) });
  }

  return (
    <section className={kundaliClasses.detailsCard}>
      <div className={kundaliClasses.detailsHeader}>
        <h3 className={kundaliClasses.detailsHeading}>
          {role === "boy" ? t("milan.vara_details") : t("milan.kanya_details")}
        </h3>
      </div>
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="w-[40%]">{row.label}</TableCell>
              <TableCell className="text-base">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function KundaliMilan() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const pickerRef = useRef<MilanProfilePickerHandle>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [ayanamsha, setAyanamsha] = useState<AyanamshaMode>(loadSavedAyanamshaMode);
  const [boyProfile, setBoyProfile] = useState<Profile | null>(null);
  const [girlProfile, setGirlProfile] = useState<Profile | null>(null);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  useRouteLoading(authLoading);

  const ready = isAuthenticated && !!boyProfile && !!girlProfile;
  const boyQueryParams = boyProfile ? milanQueryFromProfile(boyProfile) : null;
  const girlQueryParams = girlProfile ? milanQueryFromProfile(girlProfile) : null;
  const hasValidCharts = !!boyQueryParams && !!girlQueryParams;
  const milanLang = lang.startsWith("en") ? "en" : "ne";

  // The full ashtakuta match — including each side's moon rashi/nakshatra —
  // is computed by the API from the two birth moments.
  const milanQ = useQuery({
    queryKey:
      boyQueryParams && girlQueryParams
        ? milanKeys.match(boyQueryParams, girlQueryParams, ayanamsha, milanLang)
        : ["kundali", "milan", "idle"],
    queryFn: () =>
      fetchKundaliMilan(boyQueryParams!, girlQueryParams!, {
        ayanamsha,
        lang: milanLang,
      }),
    enabled: ready && hasValidCharts,
    staleTime: 1000 * 60 * 5,
  });

  const loading = ready && hasValidCharts && milanQ.isLoading;
  const error = ready && hasValidCharts && milanQ.isError;
  const missingBirth = ready && boyProfile && girlProfile && !hasValidCharts;
  const milan = milanQ.data;

  return (
    <PageShell className="space-y-0 pb-16">
      <div className={kundaliClasses.headerRow}>
        <div>
          <div className={kundaliClasses.eyebrow}>
            {t("milan.eyebrow")}
          </div>
          <h1 className={cn(kundaliClasses.title, kundaliClasses.titleRow, "m-0")}>
            <Heart className="w-7 h-7 text-secondary shrink-0" />
            {t("milan.title")}
          </h1>
          <p className={cn(kundaliClasses.subtitle, "max-w-2xl")}>
            {isAuthenticated ? t("milan.subtitle_auth") : t("milan.login_required")}
          </p>
        </div>
        {isAuthenticated ? (
          <Button className="shrink-0" onClick={() => pickerRef.current?.openAdd()}>
            <Plus className="size-4" /> {t("kundali.add_profile")}
          </Button>
        ) : null}
      </div>

      {authLoading ? (
        <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
          {t("common.loading")}
        </div>
      ) : !isAuthenticated ? (
        <section className={cn(kundaliClasses.loginCard, "text-center shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
          <div className={cn(kundaliClasses.loginIcon, "mx-auto flex")}>
            <Heart className="h-7 w-7 text-secondary" />
          </div>
          <h2 className={kundaliClasses.loginTitle}>{t("milan.login_prompt_title")}</h2>
          <p className={cn(kundaliClasses.loginBody, "mx-auto")}>
            {t("milan.login_prompt_body")}
          </p>
          <div className={kundaliClasses.loginActions}>
            <Button size="lg" onClick={() => openAuth("login")}>
              <LogIn className="size-4" /> {t("kundali.login")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => openAuth("signup")}>
              <UserPlus className="size-4" /> {t("kundali.signup")}
            </Button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          <p className={kundaliClasses.profileHint}>{t("milan.profile_hint")}</p>

          <MilanProfilePicker
            ref={pickerRef}
            boyId={boyProfile?.id ?? null}
            girlId={girlProfile?.id ?? null}
            onBoySelect={setBoyProfile}
            onGirlSelect={setGirlProfile}
          />

          {boyProfile && girlProfile ? (
            <>
              <AyanamshaSelector mode={ayanamsha} onModeChange={setAyanamsha} />

              {missingBirth ? (
                <div className={cn(kundaliClasses.warnBox, kundaliClasses.warnText)}>
                  {t("milan.missing_birth")}
                </div>
              ) : null}

              {loading ? (
                <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
                  {t("common.loading")}
                </div>
              ) : null}

              {error ? (
                <div className={cn(kundaliClasses.errorBox, kundaliClasses.errorText)}>
                  {t("milan.error")}
                </div>
              ) : null}

              {!missingBirth && !loading && !error && milan ? (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <BirthDetailsTable
                      role="boy"
                      profile={boyProfile}
                      person={milan.boy}
                      ayanamsha={ayanamsha}
                      lang={lang}
                    />
                    <BirthDetailsTable
                      role="girl"
                      profile={girlProfile}
                      person={milan.girl}
                      ayanamsha={ayanamsha}
                      lang={lang}
                    />
                  </div>

                  <KundaliMilanResult
                    boyName={boyProfile.full_name}
                    girlName={girlProfile.full_name}
                    result={milan.result}
                    lang={lang}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className={cn(kundaliClasses.emptyBoxShort, kundaliClasses.emptyText)}>
              {t("milan.need_two_profiles")}
            </div>
          )}
        </div>
      )}

      <AuthDialog
        key={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </PageShell>
  );
}
