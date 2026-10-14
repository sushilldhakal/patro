import { lazy, Suspense } from "react";
import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useSaitProfilePicker } from "@vedic-patro/features/sait";
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
  const { isAuthenticated } = useAuth();
  const picker = useSaitProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy } = picker;

  const label = (
    <span className={cn(saitClasses.pickerLabel, "inline-flex", saitClasses.pickerLabelText)}>
      <UserRound className="size-4 text-secondary" />
      {copy.label}
    </span>
  );

  if (picker.status === "guest") {
    return (
      <div className={saitClasses.pickerRow}>
        {label}
        <button
          type="button"
          onClick={picker.openAuth}
          className={cn(saitClasses.pickerSignIn, saitClasses.pickerSignInText, "hover:bg-surface-muted")}
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
      <div className={saitClasses.pickerRow}>
        {label}
        <span className={saitClasses.pickerHint}>{copy.empty}</span>
      </div>
    );
  }

  return (
    <div className={saitClasses.pickerRow}>
      {label}
      <select
        value={selectedId ?? ""}
        disabled={picker.loading}
        onChange={(e) => picker.select(e.target.value || null)}
        className={cn(
          saitClasses.pickerSelect,
          saitClasses.pickerSelectText,
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
