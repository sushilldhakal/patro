// The phone's sky: BS 1950 to 2150 for both systems is inside the app, read straight from
// `assets/sky/` with no network. Outside those years a nine-year batch comes from the server,
// is kept in the cache folder, and is read like the bundled file. With no stored data and no
// connection, the built-in fallback answers (see `@vedic-patro/domain/astronomy/sky`).
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

import { getBytes } from "@vedic-patro/api-client";
import { Sky, type SkyIo, type SkySystem } from "@vedic-patro/domain/astronomy/sky";

/** Metro asset ids of the shipped files, by the names the module asks for. */
const BUNDLED: Record<string, number> = {
  "surya.index": require("@/assets/sky/surya.index.bin"),
  "surya.cheb": require("@/assets/sky/surya.cheb.bin"),
  "drik.index": require("@/assets/sky/drik.index.bin"),
  "drik.cheb": require("@/assets/sky/drik.cheb.bin"),
};

const CACHE_DIR = `${FileSystem.cacheDirectory}sky/`;

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const io: SkyIo = {
  async bundled(name) {
    const id = BUNDLED[name];
    if (id === undefined) return null;
    try {
      const asset = Asset.fromModule(id);
      if (!asset.localUri) await asset.downloadAsync();
      if (!asset.localUri) return null;
      return fromBase64(
        await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 }),
      );
    } catch {
      return null;
    }
  },
  async readCache(name) {
    try {
      const path = `${CACHE_DIR}${name}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      return fromBase64(await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 }));
    } catch {
      return null;
    }
  },
  async writeCache(name, bytes) {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    await FileSystem.writeAsStringAsync(`${CACHE_DIR}${name}`, toBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
  },
  fetchBytes: getBytes,
};

const opened = new Map<SkySystem, Promise<Sky>>();

/** The sky of one system, opened once. Never rejects: a missing file only means the fallback answers. */
export function getSky(system: SkySystem): Promise<Sky> {
  let sky = opened.get(system);
  if (!sky) {
    const created = new Sky(system, io);
    sky = created.open().then(
      () => created,
      () => created,
    );
    opened.set(system, sky);
  }
  return sky;
}
