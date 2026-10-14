import { lazy, Suspense } from "react";
import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useRashifalProfilePicker } from "@vedic-patro/features/rashifal";
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
  const { isAuthenticated } = useAuth();
  const picker = useRashifalProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy } = picker;

  const label = (
    <span className={cn("inline-flex", rashifalClasses.picker.label, rashifalClasses.picker.labelText)}>
      <UserRound className="size-4 text-secondary" />
      {copy.label}
    </span>
  );

  if (picker.status === "guest") {
    return (
      <div className={cn("flex", rashifalClasses.picker.row)}>
        {label}
        <button
          type="button"
          onClick={picker.openAuth}
          className={cn(
            rashifalClasses.picker.signInButton,
            rashifalClasses.picker.signInText,
            "hover:bg-surface-muted",
          )}
        >
          {copy.signIn}
        </button>
        {picker.authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={picker.authOpen} onOpenChange={picker.setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null}
      </div>
    );
  }

  if (picker.status === "empty") {
    return (
      <div className={cn("flex", rashifalClasses.picker.row)}>
        {label}
        <span className={rashifalClasses.picker.empty}>{copy.empty}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex", rashifalClasses.picker.row)}>
      {label}
      <select
        value={selectedId ?? ""}
        disabled={picker.loading}
        onChange={(e) => picker.select(e.target.value || null)}
        className={cn(
          rashifalClasses.picker.select,
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
        )}
      >
        {picker.options.map((o) => (
          <option key={o.id ?? ""} value={o.id ?? ""}>
            {o.id == null && picker.loading ? copy.loading : o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
