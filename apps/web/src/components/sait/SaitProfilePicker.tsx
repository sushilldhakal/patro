import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { listProfiles, type Profile } from "@/lib/auth/client";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { importWithRetry } from "@/lib/lazy-route";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("@/components/auth/AuthDialog")).then((m) => ({
    default: m.AuthDialog,
  })),
);

/**
 * Lets a signed-in user pick one of their saved profiles so the sait dates get
 * a native (birth-chart) verdict. Guests see a "sign in to personalise" chip.
 */
export function SaitProfilePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
}) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    listProfiles()
      .then((list) => alive && setProfiles(list))
      .catch(() => alive && setProfiles([]));
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  const label = (
    <span className={cn(saitClasses.pickerLabel, "inline-flex", saitClasses.pickerLabelText)}>
      <UserRound className="size-4 text-secondary" />
      {t("sait.personalise")}
    </span>
  );

  if (!isAuthenticated) {
    return (
      <div className={saitClasses.pickerRow}>
        {label}
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className={cn(saitClasses.pickerSignIn, saitClasses.pickerSignInText, "hover:bg-surface-muted")}
        >
          {t("sait.sign_in_to_pick_your_profile")}
        </button>
        {authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null}
      </div>
    );
  }

  if (profiles !== null && profiles.length === 0) {
    return (
      <div className={saitClasses.pickerRow}>
        {label}
        <span className={saitClasses.pickerHint}>
          {t("sait.no_saved_profiles_add_one_in_your_account")}
        </span>
      </div>
    );
  }

  return (
    <div className={saitClasses.pickerRow}>
      {label}
      <select
        value={selectedId ?? ""}
        disabled={profiles === null}
        onChange={(e) => {
          const id = e.target.value;
          onSelect(id ? (profiles?.find((p) => p.id === id) ?? null) : null);
        }}
        className={cn(
          saitClasses.pickerSelect,
          saitClasses.pickerSelectText,
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
        )}
      >
        <option value="">
          {profiles === null
            ? t("sait.loading")
            : t("sait.general_no_profile")}
        </option>
        {(profiles ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
