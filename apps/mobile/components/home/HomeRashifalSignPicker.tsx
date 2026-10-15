import type { RashifalPeriod, RashifalSignBlock } from "@vedic-patro/api-client";
import { rashifalToneBar, rashifalToneText } from "@vedic-patro/domain/rashifal-ui";
import { useHomeRashifalSignPicker } from "@vedic-patro/features/home";
import { HomeRashifalSignPicker as HomeRashifalSignPickerView } from "@vedic-patro/ui/kit/shell";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";

type Props = {
  signs: RashifalSignBlock[];
  period: RashifalPeriod;
  defaultSignId?: number;
  contentInset?: number;
};

/** Rashifal sign picker. Glyphs and cards stay in their own folders; the grid is shared. */
export function HomeRashifalSignPicker({ signs, period, defaultSignId }: Props) {
  const picker = useHomeRashifalSignPicker(signs, defaultSignId);
  if (!signs.length) return null;
  const selected = signs[picker.selectedIndex];
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
      cards={selected ? <RashifalSignCard sign={selected} period={period} /> : null}
    />
  );
}
