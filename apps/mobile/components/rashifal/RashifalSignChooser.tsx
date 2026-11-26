import { useEffect, useState } from "react";
import type { RashifalPeriod, RashifalSignBlock } from "@vedic-patro/api-client";
import { rashifalToneBar, rashifalToneText } from "@vedic-patro/design-tokens/classes/rashifal-tone-classes";
import { useHomeRashifalSignPicker } from "@vedic-patro/features/home";
import { HomeRashifalSignPicker as SignPickerView } from "@vedic-patro/ui/kit/shell";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { deviceStore } from "@/lib/device-store";

const MY_SIGN_KEY = "rashifal.my-sign.v1";

/** The reader's own rashi, remembered on the phone once picked. `undefined` while it is read. */
function useMySign() {
  const [sign, setSign] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    void deviceStore.get<number>(MY_SIGN_KEY).then((v) => setSign(v ?? null));
  }, []);
  const choose = (id: number) => {
    setSign(id);
    void deviceStore.set(MY_SIGN_KEY, id);
  };
  return { sign, choose };
}

type Signs = { sign: RashifalSignBlock; taraLine?: string }[];

/**
 * The chosen rashi for the rashifal page: the reader's own (remembered on the phone) until they
 * turn the wheel or tap a sign. The phone screen docks the wheel above the tab bar and puts the
 * chosen sign's card in the page; wider screens draw both with `RashifalSignChooser`.
 */
export function useRashifalSignChoice(signs: Signs) {
  const my = useMySign();
  const blocks = signs.map((s) => s.sign);
  const picker = useHomeRashifalSignPicker(blocks, my.sign ?? undefined);
  const select = (i: number) => {
    picker.selectIndex(i);
    const n = blocks.length;
    const sign = blocks[((i % n) + n) % n];
    if (sign) my.choose(sign.id);
  };
  return {
    ready: blocks.length > 0 && my.sign !== undefined,
    picker,
    select,
    selected: signs[picker.selectedIndex],
    wheelItems: picker.thumbs.map((sign) => ({
      id: sign.id,
      name: sign.name,
      percentLabel: sign.percentLabel,
      glyph: <RashiGlyphIcon name={sign.glyphName} number={sign.id} size={34} />,
    })),
  };
}

/**
 * Rashifal as most patro apps show it: a 3x4 grid of the twelve signs, and the one picked below it,
 * opening on the reader's own rashi (remembered from their last pick) instead of all twelve readings
 * one after the other.
 */
export function RashifalSignChooser({ signs, period }: { signs: Signs; period: RashifalPeriod }) {
  const choice = useRashifalSignChoice(signs);
  const { picker, select, selected } = choice;
  if (!choice.ready) return null;
  return (
    <SignPickerView
      label={picker.copy.chooseRashi}
      prevLabel={picker.copy.prev}
      nextLabel={picker.copy.next}
      onSelect={select}
      onPrev={() => select(picker.selectedIndex - 1)}
      onNext={() => select(picker.selectedIndex + 1)}
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
      cards={selected ? <RashifalSignCard sign={selected.sign} period={period} taraLine={selected.taraLine} /> : null}
    />
  );
}
