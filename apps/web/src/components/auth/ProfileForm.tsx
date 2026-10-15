import { CityAutocomplete } from "@/components/auth/CityAutocomplete";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { ProfileForm as Shared } from "@vedic-patro/ui/kit/jyotish";

export { EMPTY_PROFILE, profileToInput } from "@vedic-patro/features/account";

/** Birth-place search stays in the app. The fields are shared. */
export function ProfileForm({
  initial,
  existing,
  onCancel,
  onSaved,
}: {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
}) {
  return (
    <Shared
      initial={initial}
      existing={existing}
      onCancel={onCancel}
      onSaved={onSaved}
      renderPlace={({ value, onSelect }) => <CityAutocomplete value={value} onSelect={onSelect} />}
    />
  );
}
