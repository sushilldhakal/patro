import { useEffect } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useKundaliDetailPage, AYANAMSHA_STORAGE_KEY, parseAyanamshaMode, type KundaliMetaItem } from "@vedic-patro/features/kundali";
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
import { hasStoredSession } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
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
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

const ayanamshaStorage = {
  load: () => parseAyanamshaMode(localStorage.getItem(AYANAMSHA_STORAGE_KEY)),
  save: (mode: AyanamshaMode) => localStorage.setItem(AYANAMSHA_STORAGE_KEY, mode),
};

const META_ICONS: Record<KundaliMetaItem["key"], React.ComponentType<{ className?: string }>> = {
  birthDate: Calendar,
  time: Clock,
  place: MapPin,
  timezone: Globe,
};

function MetaItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={cn(kundaliClasses.metaItem, "flex min-w-[6.75rem] sm:min-w-[7.25rem]")}>
      <div className={cn(kundaliClasses.metaLabelRow, kundaliClasses.metaLabel)}>
        <Icon className="size-2.5 shrink-0 opacity-70" />
        {label}
      </div>
      <p className={cn(mono ? kundaliClasses.metaValueMono : kundaliClasses.metaValue, "break-words")}>
        {value}
      </p>
    </div>
  );
}

export function KundaliDetail() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { profileId } = useParams({ strict: false }) as { profileId?: string };

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
  const profiles = useProfilesQuery(hasStoredSession());
  const page = useKundaliDetailPage({ profileId, auth, profiles, ayanamshaStorage });
  const { status, profile, copy } = page;

  useRouteLoading(auth.loading);

  const backLink = (
    <Link
      to="/kundali"
      className={cn(kundaliClasses.backLink, kundaliClasses.backLinkText, "inline-flex transition-colors hover:text-foreground")}
    >
      <ArrowLeft className="size-4" /> {copy.backAll}
    </Link>
  );

  if (status === "loading") {
    return (
      <PageShell className="pb-16">
        <div className={cn(kundaliClasses.emptyBoxTall, kundaliClasses.emptyText)}>
          {copy.loading}
        </div>
      </PageShell>
    );
  }

  if (status === "login") {
    return (
      <PageShell className="space-y-4 pb-16">
        {backLink}
        <div className={cn(kundaliClasses.noticeBox, kundaliClasses.emptyText)}>
          {copy.loginRequired}
        </div>
      </PageShell>
    );
  }

  if (status === "not-found" || !profile) {
    return (
      <PageShell className="space-y-4 pb-16">
        {backLink}
        <div className={cn(kundaliClasses.noticeBox, "text-center")}>
          <p className={kundaliClasses.noticeTitle}>{copy.notFound}</p>
          <p className={cn(kundaliClasses.noticeBody, "mx-auto")}>
            {copy.notFoundBody}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6 pb-20">
      {/* Top bar */}
      <div className={kundaliClasses.topBar}>
        {backLink}
        <div className={kundaliClasses.topBarActions}>
          <Link
            to="/kundali"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Sparkles className="size-4" /> {copy.otherKundali}
          </Link>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => page.edit.setOpen(true)}>
            <Pencil className="size-3.5" /> {copy.editProfile}
          </Button>
        </div>
      </div>

      {/* Page title + birth facts on one row */}
      <header className={cn(kundaliClasses.profileHeader, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:divide-x lg:divide-border">
          <div className={cn(kundaliClasses.profileIdentity, "flex flex-1")}>
            <div className={cn(kundaliClasses.profileAvatar, "flex ring-1 ring-secondary/25")}>
              <User className="size-4 text-secondary sm:size-[1.125rem]" />
            </div>
            <div className="min-w-0">
              <p className={kundaliClasses.profileEyebrow}>
                {copy.eyebrow}
              </p>
              <h1 className={cn(kundaliClasses.profileName, kundaliClasses.profileNameRow, "m-0")}>
                {profile.full_name}
                {profile.is_default && (
                  <Star className="size-3.5 text-secondary fill-secondary/30 sm:size-4" aria-hidden />
                )}
              </h1>
              {profile.gender ? (
                <p className={kundaliClasses.profileGender}>{profile.gender}</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto border-t border-border lg:border-t-0">
            <div className="flex min-w-max divide-x divide-border">
              {page.meta.map((item) => (
                <MetaItem key={item.key} icon={META_ICONS[item.key]} label={item.label} value={item.value} mono={item.mono} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {status === "ready" && page.moment && page.location ? (
        <>
          <AyanamshaSelector mode={page.ayanamshaMode} onModeChange={page.setAyanamshaMode} />
          <KundaliSectionNav
            className="calendar:hidden"
            activeId={section}
            onNavigate={navigateSection}
            variant="horizontal"
          />
          <KundaliView
            moment={page.moment}
            locationParams={page.location.params}
            locationLabel={page.location.label}
            ayanamshaMode={page.ayanamshaMode}
            hideBirthSummary
            section={section}
          />
        </>
      ) : (
        <div className={cn(kundaliClasses.noBirthBox, "text-center")}>
          <Clock className="mx-auto mb-4 size-10" />
          <p className={kundaliClasses.noBirthTitle}>{copy.noBirthTitle}</p>
          <p className={cn(kundaliClasses.noBirthBody, "mx-auto")}>
            {copy.noBirthBody}
          </p>
          <Button className="mt-6 gap-1.5" onClick={() => page.edit.setOpen(true)}>
            <Pencil className="size-4" /> {copy.editProfile}
          </Button>
        </div>
      )}

      <Dialog open={page.edit.open} onOpenChange={page.edit.setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{copy.editProfile}</DialogTitle>
            <DialogDescription>{copy.editHint}</DialogDescription>
          </DialogHeader>
          <ProfileForm
            initial={profileToInput(profile)}
            existing={profile}
            onCancel={() => page.edit.setOpen(false)}
            onSaved={async () => {
              page.edit.setOpen(false);
              await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
            }}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default KundaliDetail;
