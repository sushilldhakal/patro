/** The website's bindings for the shared learn figures: this file supplies the image URLs. */
import earthUrl from "@/assets/earth.svg?url";
import earthRotatingUrl from "@/assets/earth_rotating.svg?url";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { EarthRotationDiagram as EarthRotationFigure, ServerPipelineDiagram as PipelineFigure } from "@vedic-patro/ui/kit/learn";

export function ServerPipelineDiagram() {
  return <PipelineFigure earthSrc={earthUrl} grahaSrc={GRAHA_PLANET_ICON_URL} />;
}

export function EarthRotationDiagram() {
  return <EarthRotationFigure globeSrc={earthRotatingUrl} />;
}
