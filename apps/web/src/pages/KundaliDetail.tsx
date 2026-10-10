import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  MapPin,
  Pencil,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { hasStoredSession, type Profile } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { AYANAMSHA_MODES, type AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { KundaliView } from "@/components/kundali/KundaliView";
import {
  DEFAULT_KUNDALI_SECTION,
  KundaliSectionNav,
  parseKundaliSectionFromHash,
  type KundaliSectionId,
} from "@/components/kundali/KundaliSectionNav";
import { PageShell } from "@/components/PageShell";
import { ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatProfileBirthLabel, profileBirthMoment, profileLocation } from "@/lib/kundali/profile-chart";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@/lib/utils";

const AYANAMSHA_KEY = "dhakalPatroAyanamshaMode";

function loadSavedAyanamshaMode(): AyanamshaMode {
  const saved = localStorage.getItem(AYANAMSHA_KEY);
  return AYANAMSHA_MODES.some((m) => m.id === saved) ? (saved as AyanamshaMode) : "nepal";
}

function MetaItem({
  icon: Icon,
  label,
  value,
  sub,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-[6.75rem] flex-col justify-center gap-0 px-2.5 py-2 sm:min-w-[7.25rem] sm:px-3">
      <div className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wider">
        <Icon className="size-2.5 shrink-0 opacity-70" />
        {label}
      </div>
      <p className={cn("text-sm font-semibold text-foreground leading-tight break-words", mono && "font-mono text-xs")}>
        {value}
      </p>
      {sub ? <p className="text-sm leading-tight mt-0.5">{sub}</p> : null}
    </div>
  );
}

export function KundaliDetail() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { profileId } = useParams({ strict: false }) as { profileId?: string };
  const [editOpen, setEditOpen] = useState(false);

  const [ayanamshaMode, setAyanamshaModeState] = useState<AyanamshaMode>(loadSavedAyanamshaMode);
  const setAyanamshaMode = (next: AyanamshaMode) => {
    setAyanamshaModeState(next);
    localStorage.setItem(AYANAMSHA_KEY, next);
  };

  // Drive the active section from the router's hash so every navigation source
  // stays in sync: the desktop sidebar's <Link hash>, the mobile tab nav, deep
  // links and browser back/forward. (The old state + native `hashchange`
  // listener never updated for router-driven hash changes — the sidebar Links
  // route through TanStack Router, which doesn't fire a native `hashchange` —
  // so clicking a desktop section tab left the rendered section unchanged.)
  const navigate = useNavigate();
  const routerHash = useRouterState({ select: (s) => s.location.hash });
  const section = parseKundaliSectionFromHash(routerHash ?? "");

  useEffect(() => {
    if (!routerHash) {
      navigate({ to: ".", hash: DEFAULT_KUNDALI_SECTION, replace: true });
    }
  }, [routerHash, navigate]);

  const navigateSection = (id: KundaliSectionId) => {
    navigate({ to: ".", hash: id, replace: true });
  };

  // Gated on a stored token rather than the resolved `isAuthenticated`, so this
  // fires in parallel with AuthContext's apiMe() call instead of waiting for it
  // — collapsing what was a 3-hop waterfall (auth check -> profiles -> chart)
  // into 2 parallel round trips followed by the chart fetch.
  const {
    data: profiles,
    isLoading,
    isError,
  } = useProfilesQuery(hasStoredSession());

  const profile = useMemo<Profile | undefined>(
    () => profiles?.find((p) => p.id === profileId),
    [profiles, profileId],
  );

  const birthMoment = useMemo(() => (profile ? profileBirthMoment(profile) : null), [profile]);
  const location = useMemo(() => (profile ? profileLocation(profile) : null), [profile]);

  const birthDateMeta = useMemo(() => {
    if (!profile?.birth_date) return { value: "—", sub: undefined as string | undefined };
    return { value: formatProfileBirthLabel(profile, "ne", toNepaliDigits), sub: undefined };
  }, [profile]);

  useRouteLoading(authLoading);

  const profilesPending = isAuthenticated && isLoading && !profiles;

  const backLink = (
    <Link
      to="/kundali"
      className="inline-flex items-center gap-1.5 text-sm text-base transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {t("kundali.back_all")}
    </Link>
  );

  if (authLoading || profilesPending) {
    return (
      <PageShell className="pb-16">
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-16 text-center text-sm">
          {t("common.loading")}
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell className="space-y-4 pb-16">
        {backLink}
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm">
          {t("kundali.login_required")}
        </div>
      </PageShell>
    );
  }

  if (isError || (!isLoading && !profile)) {
    return (
      <PageShell className="space-y-4 pb-16">
        {backLink}
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <p className="text-sm text-base text-foreground">{t("kundali.not_found")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm">
            {t("kundali.not_found_body")}
          </p>
        </div>
      </PageShell>
    );
  }

  if (!profile) return null;

  const place = profile.location_label || profile.city || "—";
  const birthTime = profile.birth_time ? toNepaliDigits(profile.birth_time) : "—";
  const canShowChart = Boolean(birthMoment && location);

  return (
    <PageShell className="space-y-6 pb-20">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/kundali"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm text-base transition-colors hover:bg-muted hover:text-foreground"
          >
            <Sparkles className="size-4" /> {t("kundali.other_kundali")}
          </Link>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> {t("kundali.edit_profile")}
          </Button>
        </div>
      </div>

      {/* Page title + birth facts on one row */}
      <header className="rounded-xl border border-border bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)] overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:divide-x lg:divide-border">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 sm:px-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 ring-1 ring-secondary/25 sm:size-10">
              <User className="size-4 text-secondary sm:size-[1.125rem]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] mb-0.5">
                {t("kundali.title")}
              </p>
              <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight text-foreground m-0 flex flex-wrap items-center gap-1.5">
                {profile.full_name}
                {profile.is_default && (
                  <Star className="size-3.5 text-secondary fill-secondary/30 sm:size-4" aria-hidden />
                )}
              </h1>
              {profile.gender ? (
                <p className="text-sm mt-0.5 capitalize">{profile.gender}</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto border-t border-border lg:border-t-0">
            <div className="flex min-w-max divide-x divide-border">
              <MetaItem
                icon={Calendar}
                label={t("kundali.birth_date")}
                value={birthDateMeta.value}
                sub={birthDateMeta.sub}
              />
              <MetaItem icon={Clock} label={t("kundali.time")} value={birthTime} mono />
              <MetaItem icon={MapPin} label={t("kundali.place")} value={place} />
              <MetaItem
                icon={Globe}
                label={t("kundali.timezone")}
                value={profile.timezone || "—"}
                mono
              />
            </div>
          </div>
        </div>
      </header>

      {canShowChart ? (
        <>
          <AyanamshaSelector mode={ayanamshaMode} onModeChange={setAyanamshaMode} />
          <KundaliSectionNav
            className="min-[992px]:hidden"
            activeId={section}
            onNavigate={navigateSection}
            variant="horizontal"
          />
          <KundaliView
            moment={birthMoment!}
            locationParams={location!.params}
            locationLabel={location!.label}
            ayanamshaMode={ayanamshaMode}
            hideBirthSummary
            section={section}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Clock className="mx-auto mb-4 size-10" />
          <p className="text-base font-semibold text-foreground">{t("kundali.no_birth_title")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm">
            {t("kundali.no_birth_body")}
          </p>
          <Button className="mt-6 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> {t("kundali.edit_profile")}
          </Button>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("kundali.edit_profile")}</DialogTitle>
            <DialogDescription>{t("kundali.generate_hint")}</DialogDescription>
          </DialogHeader>
          <ProfileForm
            initial={profileToInput(profile)}
            existing={profile}
            onCancel={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
            }}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default KundaliDetail;
