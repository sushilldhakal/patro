import { memo } from "react";
import type { Shloka } from "@/lib/documents/api";
import { ShlokaCard as Shared } from "@vedic-patro/ui/kit/jyotish";

type Props = {
  shloka: Shloka;
  isActive: boolean;
  isPlaying: boolean;
  progress: number;
  meaningOpen: boolean;
  playsFromFull: boolean;
  onPlay: (shloka: Shloka) => void;
  onToggleMeaning: (id: number) => void;
};

function ShlokaCardImpl(props: Props) {
  return (
    <Shared
      shloka={props.shloka}
      isActive={props.isActive}
      isPlaying={props.isPlaying}
      progress={props.progress}
      meaningOpen={props.meaningOpen}
      playsFromFull={props.playsFromFull}
      onPlay={() => props.onPlay(props.shloka)}
      onToggleMeaning={() => props.onToggleMeaning(props.shloka.id)}
    />
  );
}

export const ShlokaCard = memo(ShlokaCardImpl);
