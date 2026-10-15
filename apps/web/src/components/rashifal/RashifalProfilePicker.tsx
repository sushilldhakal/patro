import { lazy, Suspense } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { importWithRetry } from "@/lib/lazy-route";
import { RashifalProfilePicker as Shared } from "@vedic-patro/ui/kit/jyotish";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("@/components/auth/AuthDialog")).then((m) => ({
    default: m.AuthDialog,
  })),
);

/** Binds the shared picker to app auth. The dialog stays lazy, as on the website. */
export function RashifalProfilePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
}) {
  const { isAuthenticated } = useAuth();
  return (
    <Shared
      selectedId={selectedId}
      onSelect={onSelect}
      isAuthenticated={isAuthenticated}
      renderAuth={({ open, onOpenChange }) =>
        open ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={open} onOpenChange={onOpenChange} initialMode="login" />
          </Suspense>
        ) : null
      }
    />
  );
}
