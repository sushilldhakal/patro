import { useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useKundaliHubPage } from "@vedic-patro/features/kundali";
import { LogIn, Plus, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KundaliProfilePicker,
  type KundaliProfilePickerHandle,
} from "@/components/kundali/KundaliProfilePicker";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasStoredSession } from "@/lib/auth/client";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { PageShell } from "@/components/PageShell";
import { preloadPanchangaRoute } from "@/lib/panchanga-route-preload";
import { useProfilesQuery } from "@/lib/kundali/profiles-query";
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

export function Kundali() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { status, authDialog, canAddProfile, copy } = useKundaliHubPage({ isAuthenticated, authLoading });

  const pickerRef = useRef<KundaliProfilePickerHandle>(null);

  // Warm the shared profiles cache as soon as a token is on disk, in parallel
  // with the auth check below, instead of waiting for `isAuthenticated` to
  // resolve first. KundaliProfilePicker queries the same key and hits this
  // cache once auth clears, rather than starting its own fetch from scratch.
  useProfilesQuery(hasStoredSession());

  useRouteLoading(authLoading);

  useEffect(() => {
    if (isAuthenticated) {
      preloadPanchangaRoute("/kundali/preload");
    }
  }, [isAuthenticated]);

  return (
    <PageShell className="space-y-0 pb-16">
      <div className={kundaliClasses.headerRow}>
        <div>
          <div className={kundaliClasses.eyebrow}>
            {copy.eyebrow}
          </div>
          <h1 className={cn(kundaliClasses.title, kundaliClasses.titleRow, "m-0")}>
            <Sparkles className="w-7 h-7 text-secondary shrink-0" />
            {copy.title}
          </h1>
          <p className={kundaliClasses.subtitle}>
            {copy.subtitle}
          </p>
        </div>
        {canAddProfile && (
          <Button className="shrink-0" onClick={() => pickerRef.current?.openAdd()}>
            <Plus className="size-4" /> {copy.addProfile}
          </Button>
        )}
      </div>

      {status === "loading" ? (
        <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
          {copy.loading}
        </div>
      ) : status === "login" ? (
        <section className={cn(kundaliClasses.loginCard, "text-center shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
          <div className={cn(kundaliClasses.loginIcon, "mx-auto flex")}>
            <Sparkles className="h-7 w-7 text-secondary" />
          </div>
          <h2 className={kundaliClasses.loginTitle}>
            {copy.loginTitle}
          </h2>
          <p className={cn(kundaliClasses.loginBody, "mx-auto")}>
            {copy.loginBody}
          </p>
          <div className={kundaliClasses.loginActions}>
            <Button size="lg" onClick={authDialog.openLogin}>
              <LogIn className="size-4" /> {copy.login}
            </Button>
            <Button size="lg" variant="outline" onClick={authDialog.openSignup}>
              <UserPlus className="size-4" /> {copy.signup}
            </Button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          <p className={kundaliClasses.profileHint}>
            {copy.profileHint}
          </p>
          <KundaliProfilePicker
            ref={pickerRef}
            selectedId={null}
            onSelect={(p) => {
              preloadPanchangaRoute(`/kundali/${p.id}`);
              navigate({ to: "/kundali/$profileId", params: { profileId: p.id } });
            }}
          />
        </div>
      )}

      <AuthDialog
        key={authDialog.mode}
        open={authDialog.open}
        onOpenChange={authDialog.setOpen}
        initialMode={authDialog.mode}
      />
    </PageShell>
  );
}
