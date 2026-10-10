import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME } from "@/lib/graha-details";
import { GRAHA_META, type WheelGraha } from "@/lib/wheel-data";
import { bilingualText, useLocale } from "@/i18n/locale";

type Props = {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
  iconSize?: number;
};

export function PlanetSelectMenu({ grahas, selected, onSelect, className, iconSize = 22 }: Props) {
  const { lang } = useLocale();
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
        aria-label={bilingualText(lang, "ग्रह छान्नुहोस्", "Select a planet")}
        title={`${bilingualText(lang, "ग्रह छान्नुहोस्", "Select a planet")} · ${bilingualText(lang, selectedLabel.ne, selectedLabel.en)}`}
        className={
          className ??
          "flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(143,191,193,0.32)] bg-[rgba(11,20,22,0.96)] shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
        }
      >
        <GrahaPlanetIcon graha={selectedKey} size={iconSize} />
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={bilingualText(lang, "बन्द गर्नुहोस्", "Close")}
                className="fixed inset-0 z-[80] cursor-default bg-transparent"
                onClick={() => setOpen(false)}
              />
              <ul
                role="listbox"
                className="fixed z-[81] w-[228px] overflow-hidden rounded-[14px] border border-[rgba(143,191,193,0.32)] bg-[rgba(11,20,22,0.96)] py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                style={{ top: anchor.top, bottom: anchor.bottom, right: anchor.right }}
              >
                {grahas.map((g, i) => {
                  const key = GRAHA_DETAIL_ORDER[i] ?? "sun";
                  const name = GRAHA_NAME[key];
                  const color = GRAHA_META[i]?.color ?? "#eaf3f1";
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
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[15px] text-[#eaf3f1]"
                        style={{
                          background: active ? "rgba(198,40,40,0.28)" : "transparent",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        <GrahaPlanetIcon graha={key} size={22} />
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="flex-1">
                          {bilingualText(lang, g.ne || name.ne, name.en)}
                        </span>
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
