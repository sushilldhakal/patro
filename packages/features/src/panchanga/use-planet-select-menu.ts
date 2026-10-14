/**
 * The wheel's planet picker, shared by the website's and the app's
 * `components/panchanga/PlanetSelectMenu.tsx`: open state, the selected
 * graha and its labels, and one option per graha (name, dot colour, active).
 * Each app positions and draws the menu.
 */
import { useState } from "react";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME } from "@vedic-patro/domain/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { GRAHA_META, type WheelGraha } from "@vedic-patro/domain/wheel-data";
import { midnight } from "@vedic-patro/design-tokens";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePlanetSelectMenu({
  grahas,
  selected,
  onSelect,
}: {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { t, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const selectedKey = GRAHA_DETAIL_ORDER[selected] ?? "moon";
  const selectedName = bilingualText(lang, GRAHA_NAME[selectedKey].ne, GRAHA_NAME[selectedKey].en);
  const label = t("kundali.select_a_planet");
  return {
    open,
    setOpen,
    close: () => setOpen(false),
    selectedKey,
    selectedName,
    label,
    title: `${label} · ${selectedName}`,
    closeLabel: t("ui.common.close"),
    options: grahas.map((g, i) => {
      const key = GRAHA_DETAIL_ORDER[i] ?? "sun";
      const name = GRAHA_NAME[key];
      return {
        key,
        name: bilingualText(lang, g.ne || name.ne, name.en),
        color: GRAHA_META[i]?.color ?? midnight.foam,
        active: i === selected,
        choose: () => {
          onSelect(i);
          setOpen(false);
        },
      };
    }),
  };
}
