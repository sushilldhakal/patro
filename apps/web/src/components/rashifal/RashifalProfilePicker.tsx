import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { listProfiles, type Profile } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { importWithRetry } from "@/lib/lazy-route";

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
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
      <UserRound className="size-4 text-secondary" />
      {t("rashifal.profile.label")}
    </span>
  );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {label}
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted"
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
      <div className="flex flex-wrap items-center gap-2">
        {label}
        <span className="text-xs text-muted-foreground">{t("rashifal.profile.no_profiles")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label}
      <select
        value={selectedId ?? ""}
        disabled={profiles === null}
        onChange={(e) => {
          const id = e.target.value;
          onSelect(id ? (profiles?.find((p) => p.id === id) ?? null) : null);
        }}
        className={cn(
          "h-9 min-w-[10rem] max-w-[16rem] rounded-lg border border-border bg-card px-2.5 text-sm",
          "text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
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
