export const isBrowser = typeof window !== "undefined";

export function getLocalStorageItem(key: string): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(key);
}

export function setLocalStorageItem(key: string, value: string): void {
  if (!isBrowser) return;
  localStorage.setItem(key, value);
}

export function removeLocalStorageItem(key: string): void {
  if (!isBrowser) return;
  localStorage.removeItem(key);
}
