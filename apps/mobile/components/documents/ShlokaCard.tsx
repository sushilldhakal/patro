import { memo } from "react";
import { useRouter } from "expo-router";
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
  const router = useRouter();
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
      onDetail={(kind, value) => router.push(`/documents/details/${kind}?value=${encodeURIComponent(value)}` as never)}
    />
  );
}

export const ShlokaCard = memo(ShlokaCardImpl);
