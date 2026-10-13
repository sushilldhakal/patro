import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
import { cn } from "@vedic-patro/domain/utils";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

export function Kundali() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

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
            {t("kundali.eyebrow")}
          </div>
          <h1 className={cn(kundaliClasses.title, kundaliClasses.titleRow, "m-0")}>
            <Sparkles className="w-7 h-7 text-secondary shrink-0" />
            {t("kundali.title")}
          </h1>
          <p className={kundaliClasses.subtitle}>
            {isAuthenticated ? t("kundali.subtitle_auth") : t("kundali.login_required")}
          </p>
        </div>
        {isAuthenticated && (
          <Button className="shrink-0" onClick={() => pickerRef.current?.openAdd()}>
            <Plus className="size-4" /> {t("kundali.add_profile")}
          </Button>
        )}
      </div>

      {authLoading ? (
        <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
          {t("common.loading")}
        </div>
      ) : !isAuthenticated ? (
        <section className={cn(kundaliClasses.loginCard, "text-center shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
          <div className={cn(kundaliClasses.loginIcon, "mx-auto flex")}>
            <Sparkles className="h-7 w-7 text-secondary" />
          </div>
          <h2 className={kundaliClasses.loginTitle}>
            {t("kundali.login_prompt_title")}
          </h2>
          <p className={cn(kundaliClasses.loginBody, "mx-auto")}>
            {t("kundali.login_prompt_body")}
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
        <div className="flex flex-col gap-4">
          <p className={kundaliClasses.profileHint}>
            {t("kundali.profile_hint")}
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
        key={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </PageShell>
  );
}
