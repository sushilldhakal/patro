import { createPortal } from "react-dom";
import {
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  DayChapterBar as DayChapterBarView,
  DayChapterWelcome as DayChapterWelcomeView,
  type DayChapterBarProps,
  type DayChapterWelcomeProps,
} from "@vedic-patro/ui/kit/learn";
import type { ChapterVolumeLevel } from "@vedic-patro/features/learn";

const volumeIcon = (level: ChapterVolumeLevel) => {
  const Icon = level === "mute" ? VolumeX : level === "low" ? Volume1 : Volume2;
  return <Icon size={18} />;
};

export function DayChapterWelcome({ player }: Omit<DayChapterWelcomeProps, "playIcon">) {
  return (
    <DayChapterWelcomeView
      player={player}
      playIcon={<Play size={40} fill="currentColor" strokeWidth={0} className="ml-1.5" />}
    />
  );
}

export function DayChapterBar({ player }: Omit<DayChapterBarProps, "icons" | "portal">) {
  return (
    <DayChapterBarView
      player={player}
      portal={(node) => createPortal(node, document.body)}
      icons={{
        play: <Play size={28} fill="currentColor" strokeWidth={0} className="ml-0.75" />,
        pause: <Pause size={28} fill="currentColor" strokeWidth={0} />,
        replay: <RotateCcw size={26} />,
        prev: <SkipBack size={22} fill="currentColor" />,
        next: <SkipForward size={22} fill="currentColor" />,
        chevron: <ChevronUp size={14} />,
        close: <X size={16} />,
        volume: volumeIcon,
      }}
    />
  );
}
