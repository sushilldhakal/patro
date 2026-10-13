/** Which share image the og-preview page draws. `timeline` is the original दिन-चक्र card. */
export type OgCard = "timeline" | "periods" | "d1";

/** `?card=periods|d1` picks a card; anything else is the original timeline. */
export function ogCardFromUrl(): OgCard {
  if (typeof window === "undefined") return "timeline";
  const v = new URLSearchParams(window.location.search).get("card");
  return v === "periods" || v === "d1" ? v : "timeline";
}

/** Text for the reserved mobile-app link slot (`?app=…`). Empty until the app is published. */
export function ogAppLinkFromUrl(): string {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("app") ?? "").trim();
}
