import { useRouterState } from "@tanstack/react-router";

/**
 * The `?token=` an emailed link carries, read from the router's location so it
 * works while the page is server-rendered (`window` does not exist there).
 * Read from the raw query string: the router's parsed `search` JSON-decodes
 * values, which would alter a token that happened to look like a number.
 */
export function useSearchToken(): string | null {
  return useRouterState({
    select: (state) => new URLSearchParams(state.location.searchStr).get("token"),
  });
}
