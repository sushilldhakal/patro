import { normalizeMobilePathname } from "@/lib/mobile-nav";

export function parseKundaliProfileId(pathname: string): string | null {
  const p = normalizeMobilePathname(pathname);
  const match = p.match(/^\/kundali\/([^/]+)$/);
  return match?.[1] ?? null;
}
