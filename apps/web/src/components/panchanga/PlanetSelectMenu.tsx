import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { WheelGraha } from "@vedic-patro/domain/wheel-data";
import { usePlanetSelectMenu } from "@vedic-patro/features/panchanga";
import { brand, withAlpha } from "@vedic-patro/design-tokens";

type Props = {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
  iconSize?: number;
};

export function PlanetSelectMenu({ grahas, selected, onSelect, className, iconSize = 22 }: Props) {
  const menu = usePlanetSelectMenu({ grahas, selected, onSelect });
  const { open, setOpen } = menu;
  const [anchor, setAnchor] = useState<{ top?: number; bottom?: number; right: number }>({ right: 8 });
  const btnRef = useRef<HTMLButtonElement>(null);

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
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={menu.label}
        title={menu.title}
        className={
          className ??
          "flex h-9 w-9 items-center justify-center rounded-full border border-wheel-control-border bg-wheel-control shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
        }
      >
        <GrahaPlanetIcon graha={menu.selectedKey} size={iconSize} />
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={menu.closeLabel}
                className="fixed inset-0 z-[80] cursor-default bg-transparent"
                onClick={menu.close}
              />
              <ul
                role="listbox"
                className="fixed z-[81] w-[228px] overflow-hidden rounded-2xl border border-wheel-control-border bg-wheel-control py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                style={{ top: anchor.top, bottom: anchor.bottom, right: anchor.right }}
              >
                {menu.options.map((o) => (
                  <li key={o.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={o.active}
                      onClick={o.choose}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-base text-ill-midnight-foam"
                      style={{
                        background: o.active ? withAlpha(brand.vermilion, 0.28) : "transparent",
                        fontWeight: o.active ? 700 : 500,
                      }}
                    >
                      <GrahaPlanetIcon graha={o.key} size={22} />
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: o.color }}
                      />
                      <span className="flex-1">{o.name}</span>
                      {o.active ? <span aria-hidden>✓</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
