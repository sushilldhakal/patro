/**
 * The home page's monthly rashifal picker, shared by the website's and the
 * app's `components/home/HomeRashifalSignPicker.tsx`: a 3x4 grid of sign
 * thumbnails (name, glyph name, percentage bar and tone) and the selected
 * sign, which each app keeps in step with its own card carousel.
 */
import { useCallback, useState } from "react";
import type { RashifalSignBlock } from "@vedic-patro/api-client";
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

export type HomeRashifalThumb = {
  id: number;
  index: number;
  name: string;
  /** Name for the sign's glyph icon. */
  glyphName: string;
  /** Bar width, 0-100. */
  percent: number;
  percentLabel: string;
  tone: RashifalSignBlock["tone"];
  active: boolean;
};

export function useHomeRashifalSignPicker(signs: RashifalSignBlock[], defaultSignId?: number) {
  const { t, lang, digits } = useLocale();
  const [selectedId, setSelectedId] = useState(defaultSignId ?? signs[0]?.id ?? 1);

  // Reset the selection when `defaultSignId` itself changes (a new month's
  // preselected sign), adjusted during render rather than in an effect.
  const [prevDefaultSignId, setPrevDefaultSignId] = useState(defaultSignId);
  if (defaultSignId !== prevDefaultSignId) {
    setPrevDefaultSignId(defaultSignId);
    if (defaultSignId != null) setSelectedId(defaultSignId);
  }

  const indexForId = (id: number) => {
    const i = signs.findIndex((s) => s.id === id);
    return i >= 0 ? i : 0;
  };

  /** Select by position; wraps around both ends. Stable while `signs` is. */
  const selectIndex = useCallback(
    (i: number) => {
      if (!signs.length) return;
      const sign = signs[((i % signs.length) + signs.length) % signs.length];
      if (sign) setSelectedId(sign.id);
    },
    [signs],
  );

  const thumbs: HomeRashifalThumb[] = signs.map((sign, index) => {
    const percent = sign.percent ?? 50;
    return {
      id: sign.id,
      index,
      name: lang === "ne" ? sign.name : sign.title_en,
      glyphName: getRashiName(sign.id, lang),
      percent,
      percentLabel: digits(percent),
      tone: sign.tone,
      active: sign.id === selectedId,
    };
  });

  return {
    selectedId,
    selectedIndex: indexForId(selectedId),
    /** Index of the preselected sign, for the carousel's first position. */
    defaultIndex: defaultSignId != null ? indexForId(defaultSignId) : null,
    indexForId,
    selectIndex,
    thumbs,
    copy: {
      chooseRashi: t("ui.home.choose_rashi"),
      prev: t("learn_page.prev"),
      next: t("learn_page.next"),
    },
  };
}
