import { useRouter } from "expo-router";
import { useRashifalProfilePicker } from "@vedic-patro/features/rashifal";
import { useSaitProfilePicker } from "@vedic-patro/features/sait";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { requestSignIn } from "@/lib/menu-request";
import { usePageViewMenu, type PageViewOption } from "@/lib/page-view-menu";

type Args = { selectedId: string | null; onSelect: (profile: Profile | null) => void };
type Picker = ReturnType<typeof useRashifalProfilePicker>;

/** The saved profiles as the header view menu's list: signed out it offers sign-in, with none it opens the account. */
function usePublish(picker: Picker) {
  const router = useRouter();
  const options: PageViewOption[] =
    picker.status === "guest"
      ? [{ key: "sign-in", label: picker.copy.signIn, active: false, onPress: requestSignIn }]
      : picker.status === "empty"
        ? [{ key: "empty", label: picker.copy.empty, active: false, onPress: () => router.push("/account" as never) }]
        : picker.status === "loading"
          ? [{ key: "loading", label: picker.copy.loading, active: false, onPress: () => {} }]
          : picker.options.map((o) => ({ key: o.id ?? "none", label: o.name, active: o.active, onPress: () => picker.select(o.id) }));
  // After the page's own view groups.
  usePageViewMenu([{ key: "profiles", title: picker.copy.label, options }], 10);
}

/** Rashifal's profile choice, in the header's view menu instead of on the page. Draws nothing. */
export function RashifalProfileViewMenu(args: Args) {
  const { isAuthenticated } = useAuth();
  usePublish(useRashifalProfilePicker({ isAuthenticated, ...args }));
  return null;
}

/** साइत's profile choice, in the header's view menu instead of on the page. Draws nothing. */
export function SaitProfileViewMenu(args: Args) {
  const { isAuthenticated } = useAuth();
  usePublish(useSaitProfilePicker({ isAuthenticated, ...args }) as Picker);
  return null;
}
