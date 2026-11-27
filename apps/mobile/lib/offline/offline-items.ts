import { deleteOfflineKeys, listOfflineKeys } from "@/lib/offline/offline-http";
import { readSavedPacks, writeSavedPacks, type PackGroupId } from "@/lib/offline/offline-pack";
import { clearLegacyYears, legacyYearsBytes } from "@/lib/offline/offline-store";

/**
 * What is saved on the phone, as items the reader can see and remove one by one. An item is
 * worked out from the saved responses' paths (so it is true even for downloads made before items
 * were recorded): the sait guides, the kundali reference, the cities, each scripture, and
 * everything else (calendar years and daily detail from older builds) as "other".
 */
export type SavedItemId = "sait" | "kundali" | "cities" | `doc:${string}` | "other";
export interface SavedItem {
  id: SavedItemId;
  bytes: number;
}

export function itemForKey(key: string): SavedItemId {
  if (key.startsWith("/nepal/sait/")) return "sait";
  if (key.startsWith("/kundali/yogas/reference") || key.startsWith("/kundali/reference/")) return "kundali";
  if (key.startsWith("/nepal/cities/popular")) return "cities";
  const doc = /^\/documents\/([^/?]+)/.exec(key);
  if (doc) return `doc:${decodeURIComponent(doc[1]!)}`;
  if (key === "/documents" || key.startsWith("/documents?")) return "doc:"; // the list: kept while any text is
  return "other";
}

/** Saved items, biggest first. The scripture list itself counts toward no item. */
export async function listSavedItems(): Promise<SavedItem[]> {
  const sizes = new Map<SavedItemId, number>();
  for (const { key, bytes } of await listOfflineKeys()) {
    const id = itemForKey(key);
    if (id === "doc:") continue;
    sizes.set(id, (sizes.get(id) ?? 0) + bytes);
  }
  const legacy = await legacyYearsBytes();
  if (legacy > 0) sizes.set("other", (sizes.get("other") ?? 0) + legacy);
  return [...sizes].map(([id, bytes]) => ({ id, bytes })).sort((a, b) => b.bytes - a.bytes);
}

/** The pack record's unit for an item, so a removed item is offered for download again. */
function packUnitsFor(id: SavedItemId): (unit: string) => boolean {
  if (id === "other") return (u) => !u.startsWith("once:");
  if (id.startsWith("doc:")) return (u) => u === `once:documents:${id.slice(4)}`;
  return (u) => u === `once:${id as PackGroupId}`;
}

/** Deletes one item's saved responses and forgets it in every place's pack record. */
export async function removeSavedItem(id: SavedItemId): Promise<void> {
  const rows = await listOfflineKeys();
  const gone = new Set(rows.filter((r) => itemForKey(r.key) === id).map((r) => r.key));
  const docsLeft = rows.some((r) => !gone.has(r.key) && itemForKey(r.key).startsWith("doc:") && itemForKey(r.key) !== "doc:");
  // Last text removed: the scripture list goes with it.
  if (!docsLeft) rows.filter((r) => itemForKey(r.key) === "doc:").forEach((r) => gone.add(r.key));
  await deleteOfflineKeys([...gone]);
  if (id === "other") await clearLegacyYears();

  const drop = packUnitsFor(id);
  const packs = await readSavedPacks();
  for (const pack of Object.values(packs)) {
    pack.done = pack.done.filter((u) => !drop(u));
    // An older pack saved every text as one unit; it no longer holds once a text is removed.
    if (id.startsWith("doc:")) pack.done = pack.done.filter((u) => u !== "once:documents");
  }
  await writeSavedPacks(packs);
}
