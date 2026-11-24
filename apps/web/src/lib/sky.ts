// The browser's sky: BS 1950 to 2150 for both systems is fetched once from `/sky/` (static files,
// kept by the browser cache), and only for the system the page uses. Outside those years a
// nine-year batch comes from the server and is kept in Cache Storage. With no stored data and no
// connection, the built-in fallback answers (see `@vedic-patro/domain/astronomy/sky`).
import { Sky, SKY_DATA_VERSION, type SkyIo, type SkySystem } from "@vedic-patro/domain/astronomy/sky";

import { getBytes } from "@vedic-patro/api-client";

/** Browsers that report 2 GB or less (`navigator.deviceMemory`, in GB, capped at 8) load no sky files. */
const LEAN = typeof navigator !== "undefined" && ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 2;

const CACHE_NAME = `sky-${SKY_DATA_VERSION}`;

async function bytesOf(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer());
}

const io: SkyIo = {
  async bundled(name) {
    try {
      const response = await fetch(`/sky/${name}.bin?v=${SKY_DATA_VERSION}`);
      return response.ok ? await bytesOf(response) : null;
    } catch {
      return null;
    }
  },
  async readCache(name) {
    try {
      const hit = await (await caches.open(CACHE_NAME)).match(`/__sky/${name}`);
      return hit ? await bytesOf(hit) : null;
    } catch {
      return null;
    }
  },
  async writeCache(name, bytes) {
    await (await caches.open(CACHE_NAME)).put(`/__sky/${name}`, new Response(bytes.slice().buffer as ArrayBuffer));
  },
  fetchBytes: getBytes,
};

const opened = new Map<SkySystem, Promise<Sky>>();

/** The sky of one system, opened once. Never rejects: a missing file only means the fallback answers. */
export function getSky(system: SkySystem): Promise<Sky> {
  let sky = opened.get(system);
  if (!sky) {
    const created = new Sky(system, io, { lean: LEAN });
    sky = created.open().then(
      () => created,
      () => created,
    );
    opened.set(system, sky);
  }
  return sky;
}
