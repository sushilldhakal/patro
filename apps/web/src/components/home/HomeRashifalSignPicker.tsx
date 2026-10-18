import type { RashifalSignBlock } from "@vedic-patro/api-client";
import { rashifalToneBar, rashifalToneText } from "@vedic-patro/design-tokens/classes/rashifal-tone-classes";
import { useHomeRashifalSignPicker } from "@vedic-patro/features/home";
import { Box } from "@vedic-patro/ui";
import { HomeRashifalSignPicker as HomeRashifalSignPickerView } from "@vedic-patro/ui/kit/shell";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";

type Props = {
  signs: RashifalSignBlock[];
  /** Pre-select (e.g. Sun's sign for the current BS month). */
  defaultSignId?: number;
};

/** Monthly rashifal picker. Glyphs and cards stay in their own folders; the grid is shared. */
export function HomeRashifalSignPicker({ signs, defaultSignId }: Props) {
  const picker = useHomeRashifalSignPicker(signs, defaultSignId);
  if (!signs.length) return null;
  const selected = signs[picker.selectedIndex];
  const following = signs[(picker.selectedIndex + 1) % signs.length];
  return (
    <HomeRashifalSignPickerView
      label={picker.copy.chooseRashi}
      prevLabel={picker.copy.prev}
      nextLabel={picker.copy.next}
      onSelect={picker.selectIndex}
      onPrev={() => picker.selectIndex(picker.selectedIndex - 1)}
      onNext={() => picker.selectIndex(picker.selectedIndex + 1)}
      thumbs={picker.thumbs.map((sign) => ({
        id: sign.id,
        index: sign.index,
        name: sign.name,
        percent: sign.percent,
        percentLabel: sign.percentLabel,
        active: sign.active,
        barClassName: rashifalToneBar(sign.tone),
        percentClassName: rashifalToneText(sign.tone),
        glyph: <RashiGlyphIcon name={sign.glyphName} number={sign.id} size={32} />,
      }))}
      cards={
        <Box className="grid gap-3 xl:grid-cols-2">
          {selected ? <RashifalSignCard sign={selected} period="monthly" /> : null}
          {following && following.id !== selected?.id ? (
            <Box className="hidden xl:block">
              <RashifalSignCard sign={following} period="monthly" />
            </Box>
          ) : null}
        </Box>
      }
    />
  );
}
