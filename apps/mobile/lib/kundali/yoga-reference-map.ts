import type { KundaliYoga } from "@/lib/api";

/**
 * Maps a computed yoga key to its id in Raman's 162 reference list.
 * Keep in sync with web `YogaReferenceCatalog.tsx`.
 */
export const ENGINE_KEY_TO_REF_ID: Record<string, string> = {
  gajakesari: "1",
  sunapha: "2",
  anapha: "3",
  durdhara: "4",
  kemadruma: "5",
  chandra_mangala: "6",
  adhi: "7",
  chatussagara: "8",
  vasumati: "9",
  rajalakshana: "10",
  vanchana_chora_bheeti: "11",
  shakata: "12",
  amala: "13",
  parvata: "14",
  kahala: "15",
  veshi: "16",
  vasi: "17",
  ubhayachari: "18",
  mahapurusha_jupiter: "19",
  mahapurusha_venus: "20",
  mahapurusha_saturn: "21",
  mahapurusha_mars: "22",
  mahapurusha_mercury: "23",
  budhaditya: "24",
  mahabhagya: "25",
  pushkala: "26",
  lakshmi: "27/72",
  gauri: "28",
  bharati: "29",
  chapa: "31",
  shrinatha: "32",
  lagna_mallika: "33-44",
  shankha: "45",
  bheri: "46",
  parijata: "49",
  dhana_2_11: "122-132",
};

export function buildPresentYogaRefIds(yogas: KundaliYoga[]): Set<string> {
  const ids = new Set<string>();
  for (const y of yogas) {
    const refId = ENGINE_KEY_TO_REF_ID[y.key];
    if (y.present && refId) ids.add(refId);
  }
  return ids;
}
