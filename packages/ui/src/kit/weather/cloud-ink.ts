import { weatherInk } from "@vedic-patro/design-tokens";

/** Meteocons' near-white cloud and fog colours (gradient top; bottom, outline and fog). */
const CLOUD_TOP = new RegExp(weatherInk.meteoconCloud.top.join("|"), "gi");
const CLOUD_EDGE = new RegExp(weatherInk.meteoconCloud.edge.join("|"), "gi");

/** A Meteocon with its white clouds redrawn grey, so they show on a light card. */
export function meteoconOnLight(xml: string): string {
  const [top, edge] = weatherInk.cloudOnLight;
  return xml.replace(CLOUD_TOP, top).replace(CLOUD_EDGE, edge);
}
