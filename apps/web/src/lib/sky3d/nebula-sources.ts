import { nebulaSources } from "@vedic-patro/domain/sky3d/nebulae";

/** Nebula images are static files under `public/sky3d/nebulae`. */
export const NEBULA_SOURCES: string[] = nebulaSources(`${import.meta.env.BASE_URL}sky3d/nebulae`);
