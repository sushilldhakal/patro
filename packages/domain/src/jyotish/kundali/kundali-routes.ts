/** Profile id from `/kundali/:profileId`, or null on the list page. */
export function parseKundaliProfileId(pathname: string): string | null {
  const match = pathname.match(/^\/kundali\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function isKundaliRoute(pathname: string): boolean {
  return pathname === "/kundali" || pathname.startsWith("/kundali/");
}
