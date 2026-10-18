import {
  ChevronDown,
  ChevronUp,
  History,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { SkyTimeSheet as SkyTimeSheetView, type SkyTimeSheetProps } from "@vedic-patro/ui/kit/learn";

const icons: SkyTimeSheetProps["icons"] = {
  up: <ChevronUp className="size-4 text-white" strokeWidth={2.5} />,
  down: <ChevronDown className="size-4 text-white" strokeWidth={2.5} />,
  play: <Play className="size-5 fill-white" />,
  pause: <Pause className="size-5 fill-white" />,
  reset: <RotateCcw className="size-5" />,
  prev: <SkipBack className="size-6" />,
  now: <History className="size-6" />,
  next: <SkipForward className="size-6" />,
};

/** Binds the shared sheet to the website's icons. */
export function SkyTimeSheet(props: Omit<SkyTimeSheetProps, "icons">) {
  return <SkyTimeSheetView {...props} icons={icons} />;
}

export type { WallParts } from "@vedic-patro/domain/astronomy/sky3d/sky-time";
