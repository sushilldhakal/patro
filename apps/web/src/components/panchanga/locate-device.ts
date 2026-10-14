import { GeoLocateError } from "@vedic-patro/features/panchanga";

/** The browser's position for "use my location", rejecting with a GeoLocateError. */
export function locateDevice(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeoLocateError("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new GeoLocateError("denied"));
        else if (err.code === err.TIMEOUT) reject(new GeoLocateError("timeout"));
        else reject(new Error("not found"));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
