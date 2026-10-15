import * as Location from "expo-location";
import { GeoLocateError } from "@vedic-patro/features/panchanga";

/** The device position for "use my location", rejecting with a GeoLocateError. */
export async function locateDevice(): Promise<{ lat: number; lon: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new GeoLocateError("denied");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
}
