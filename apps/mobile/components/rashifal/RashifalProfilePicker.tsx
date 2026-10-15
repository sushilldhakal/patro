import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { RashifalProfilePicker as Shared } from "@vedic-patro/ui/kit/jyotish";

/** Binds the shared picker to app auth. */
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
      renderAuth={({ open, onOpenChange }) => <AuthDialog open={open} onOpenChange={onOpenChange} initialMode="login" />}
    />
  );
}
