import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME } from "@vedic-patro/domain/graha-details";
import { GRAHA_META, type WheelGraha } from "@vedic-patro/domain/wheel-data";
import { useLocale } from "@/lib/i18n";

import { brand, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
type Props = {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
  iconSize?: number;
  /** Match the native dock icon buttons. */
  compact?: boolean;
};

export function PlanetSelectMenu({
  grahas,
  selected,
  onSelect,
  className,
  iconSize,
  compact = false,
}: Props) {
  const resolvedIconSize = iconSize ?? (compact ? 18 : 22);
  const { t, pick } = useLocale();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top?: number; bottom?: number; right: number }>({ right: 8 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const selectedKey = GRAHA_DETAIL_ORDER[selected] ?? "moon";
  const selectedLabel = GRAHA_NAME[selectedKey];

  const openMenu = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const right = Math.max(8, window.innerWidth - r.right);
      const spaceBelow = window.innerHeight - r.bottom;
      if (spaceBelow < 320) {
        setAnchor({ bottom: window.innerHeight - r.top + 8, right });
      } else {
        setAnchor({ top: r.bottom + 8, right });
      }
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("kundali.select_a_planet")}
        title={`${t("kundali.select_a_planet")} · ${pick(selectedLabel.ne, selectedLabel.en)}`}
        className={
          className ??
          "flex h-9 w-9 items-center justify-center rounded-full border"
        }
        style={
          className
            ? undefined
            : {
                borderColor: withAlpha(wheel.line, 0.32),
                backgroundColor: withAlpha(wheel.surface, 0.96),
                boxShadow: `0 8px 20px ${withAlpha(neutral.black, 0.4)}`,
              }
        }
      >
        <GrahaPlanetIcon graha={selectedKey} size={resolvedIconSize} />
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={t("ui.common.close")}
                className="fixed inset-0 z-[80] cursor-default bg-transparent"
                onClick={() => setOpen(false)}
              />
              <ul
                role="listbox"
                className="fixed z-[81] w-[228px] overflow-hidden rounded-2xl border py-1.5"
                style={{
                  top: anchor.top,
                  bottom: anchor.bottom,
                  right: anchor.right,
                  borderColor: withAlpha(wheel.line, 0.32),
                  backgroundColor: withAlpha(wheel.surface, 0.96),
                  boxShadow: `0 10px 30px ${withAlpha(neutral.black, 0.5)}`,
                }}
              >
                {grahas.map((g, i) => {
                  const key = GRAHA_DETAIL_ORDER[i] ?? "sun";
                  const name = GRAHA_NAME[key];
                  const color = GRAHA_META[i]?.color ?? midnight.foam;
                  const active = i === selected;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onSelect(i);
                          setOpen(false);
                        }}
                        className="text-sm flex w-full items-center gap-2.5 px-3 py-2 text-left text-ill-midnight-foam"
                        style={{
                          background: active ? withAlpha(brand.vermilion, 0.28) : "transparent",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        <GrahaPlanetIcon graha={key} size={22} />
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="flex-1">{pick(g.ne || name.ne, name.en)}</span>
                        {active ? <span aria-hidden>✓</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
