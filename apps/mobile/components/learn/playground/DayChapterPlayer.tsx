import { Ionicons } from "@/components/icons/Ionicons";
import { illustration, neutral, spaceUnit } from "@vedic-patro/design-tokens";
import type { ChapterVolumeLevel } from "@vedic-patro/features/learn";
import {
  DayChapterBar as DayChapterBarView,
  DayChapterWelcome as DayChapterWelcomeView,
  type DayChapterBarProps,
  type DayChapterWelcomeProps,
} from "@vedic-patro/ui/kit/learn";

const nudge = 0.75 * spaceUnit;
const ink = neutral.white;

const volumeIcon = (level: ChapterVolumeLevel) => (
  <Ionicons name={level === "mute" ? "volume-mute" : level === "low" ? "volume-low" : "volume-medium"} size={18} color={ink} />
);

export function DayChapterWelcome({ player }: Omit<DayChapterWelcomeProps, "playIcon">) {
  return (
    <DayChapterWelcomeView
      player={player}
      playIcon={<Ionicons name="play" size={40} color={neutral.black} style={{ marginLeft: nudge }} />}
    />
  );
}

export function DayChapterBar({
  player,
  orbitPlaying,
  onOrbitToggle,
}: Omit<DayChapterBarProps, "icons">) {
  return (
    <DayChapterBarView
      player={player}
      orbitPlaying={orbitPlaying}
      onOrbitToggle={onOrbitToggle}
      icons={{
        play: <Ionicons name="play" size={28} color={ink} style={{ marginLeft: nudge }} />,
        pause: <Ionicons name="pause" size={28} color={ink} />,
        replay: <Ionicons name="refresh" size={26} color={ink} />,
        prev: <Ionicons name="play-skip-back" size={22} color={ink} />,
        next: <Ionicons name="play-skip-forward" size={22} color={ink} />,
        chevron: <Ionicons name="chevron-up" size={14} color={ink} />,
        close: <Ionicons name="close" size={16} color={ink} />,
        volume: volumeIcon,
        orbit: (
          <Ionicons
            name={orbitPlaying ? "planet" : "planet-outline"}
            size={22}
            color={orbitPlaying ? illustration.amber77 : ink}
          />
        ),
      }}
    />
  );
}
