import { configureHipsBaseUrl } from "@vedic-patro/domain/sky3d/hips";

/** The HiPS tiles are static files under `public/sky3d/milkyway-hips`. */
configureHipsBaseUrl(`${import.meta.env.BASE_URL}sky3d/milkyway-hips`);
