import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { listProfiles, type Profile } from "@/lib/auth/client";
import { cn } from "@vedic-patro/domain/utils";
import { importWithRetry } from "@/lib/lazy-route";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("@/components/auth/AuthDialog")).then((m) => ({
    default: m.AuthDialog,
  })),
);

/**
 * Lets a signed-in user pick one of their saved profiles so the rashifal grid
 * narrows to that person's own janma rashi instead of showing all twelve.
 * Deselecting (back to the placeholder option) restores the full grid.
 *
 * Mirrors {@link SaitProfilePicker} — same guest / empty / loading states —
 * but the caller resolves the selected profile's janma rashi itself, since
 * that lookup (birth → Moon sign) is specific to what the picker is filtering.
 */
export function RashifalProfilePicker({
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
    <span className={cn("inline-flex", rashifalClasses.picker.label, rashifalClasses.picker.labelText)}>
      <UserRound className="size-4 text-secondary" />
      {t("rashifal.profile.label")}
    </span>
  );

  if (!isAuthenticated) {
    return (
      <div className={cn("flex", rashifalClasses.picker.row)}>
        {label}
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className={cn(
            rashifalClasses.picker.signInButton,
            rashifalClasses.picker.signInText,
            "hover:bg-surface-muted",
          )}
        >
          {t("rashifal.profile.sign_in")}
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
      <div className={cn("flex", rashifalClasses.picker.row)}>
        {label}
        <span className={rashifalClasses.picker.empty}>{t("rashifal.profile.no_profiles")}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex", rashifalClasses.picker.row)}>
      {label}
      <select
        value={selectedId ?? ""}
        disabled={profiles === null}
        onChange={(e) => {
          const id = e.target.value;
          onSelect(id ? (profiles?.find((p) => p.id === id) ?? null) : null);
        }}
        className={cn(
          rashifalClasses.picker.select,
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
        )}
      >
        <option value="">
          {profiles === null ? t("rashifal.profile.loading") : t("rashifal.profile.all_signs")}
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
