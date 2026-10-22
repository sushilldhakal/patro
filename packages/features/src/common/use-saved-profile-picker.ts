/**
 * The "pick one of my saved profiles" control the rashifal and sait pages
 * share: guest (offer sign-in), no profiles yet, loading, or a list with a
 * "none" option first. Each page passes its own copy; each app draws it (a
 * website select, an app dropdown or sheet).
 */
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@vedic-patro/api-client";
import { useProfilesQuery } from "../kundali/use-profiles-query";

export type SavedProfileOption = { id: string | null; name: string; active: boolean };

export type SavedProfilePickerCopy = {
  label: string;
  signIn: string;
  empty: string;
  loading: string;
  /** The "no profile" option. */
  none: string;
};

export function useSavedProfilePicker({
  isAuthenticated,
  selectedId,
  onSelect,
  copy,
}: {
  isAuthenticated: boolean;
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
  copy: SavedProfilePickerCopy;
}) {
  const query = useProfilesQuery(isAuthenticated);
  const profiles: Profile[] | null = query.data ?? (query.isError ? [] : null);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const status: "guest" | "empty" | "loading" | "ready" = !isAuthenticated
    ? "guest"
    : profiles === null
      ? "loading"
      : profiles.length === 0
        ? "empty"
        : "ready";

  // Open on the reader's primary (default) profile, once: choosing another, or
  // "none", afterwards sticks.
  const primaryApplied = useRef(false);
  useEffect(() => {
    if (primaryApplied.current || selectedId || !profiles?.length) return;
    primaryApplied.current = true;
    const primary = profiles.find((p) => p.is_default);
    if (primary) onSelect(primary);
  }, [profiles, selectedId, onSelect]);

  const select = (id: string | null) => {
    onSelect(id ? (profiles?.find((p) => p.id === id) ?? null) : null);
    setMenuOpen(false);
  };

  const selected = profiles?.find((p) => p.id === selectedId) ?? null;

  return {
    status,
    loading: status === "loading",
    options: [
      { id: null, name: copy.none, active: !selectedId },
      ...(profiles ?? []).map((p) => ({ id: p.id, name: p.full_name, active: p.id === selectedId })),
    ] as SavedProfileOption[],
    select,
    /** What the closed control shows: the chosen name, "loading", or the "none" option. */
    current: status === "loading" ? copy.loading : (selected?.full_name ?? copy.none),
    authOpen,
    setAuthOpen,
    openAuth: () => setAuthOpen(true),
    menuOpen,
    setMenuOpen,
    toggleMenu: () => setMenuOpen((v) => !v),
    copy,
  };
}
