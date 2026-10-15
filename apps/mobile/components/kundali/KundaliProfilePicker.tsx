import { forwardRef, useImperativeHandle, useRef } from "react";
import { ProfileForm } from "@/components/auth/ProfileForm";
import type { Profile } from "@/lib/auth/client";
import { KundaliProfilePicker as Shared } from "@vedic-patro/ui/kit/jyotish";

export interface KundaliProfilePickerHandle {
  openAdd: () => void;
}

export const KundaliProfilePicker = forwardRef<
  KundaliProfilePickerHandle,
  { selectedId?: string | null; onSelect: (profile: Profile) => void }
>(function KundaliProfilePicker(props, ref) {
  const openAdd = useRef<() => void>(() => {});
  useImperativeHandle(ref, () => ({ openAdd: () => openAdd.current() }), []);
  return (
    <Shared
      {...props}
      bindOpen={(fn) => {
        openAdd.current = fn;
      }}
      renderForm={(args) => <ProfileForm {...args} />}
    />
  );
});
