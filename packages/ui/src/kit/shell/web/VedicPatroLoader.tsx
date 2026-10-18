import { cn } from "@vedic-patro/design-tokens/cn";
import { useVedicPatroLoader } from "@vedic-patro/features/common";
import { Box, Text } from "@vedic-patro/ui";
import type { VedicPatroLoaderProps } from "../contract";

/** Caption and column. The mark (image or animated art) is passed in. */
export function VedicPatroLoader({ label, mark, className }: VedicPatroLoaderProps) {
  const shown = useVedicPatroLoader(label);
  return (
    <Box className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {mark}
      {shown ? <Text className="text-sm text-foreground">{shown}</Text> : null}
    </Box>
  );
}
