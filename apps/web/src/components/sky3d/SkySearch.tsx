/**
 * The sky search: a box that finds anything nameable and puts it in the middle
 * of the screen.
 *
 * The input never leaves. Whatever the panel is showing — the three shortcuts,
 * a branch of the browse tree, a list of results — the box stays at the top and
 * keeps focus, so a reader who opened it to browse can start typing without
 * going back anywhere first. The only thing that closes it is a press outside.
 */

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, List, Search, Star, X } from "lucide-react";
import { bilingualText, useLocale } from "@/i18n/locale";
import {
  SKY_BY_ID,
  SKY_KINDS,
  searchSky,
  skyTargetsOfKind,
  type SkyTarget,
  type SkyTargetKind,
} from "@/lib/sky3d/sky-catalogue";
import { cn } from "@/lib/utils";

/** Which face of the panel is showing, when nothing has been typed. */
type Pane =
  | { view: "home" }
  | { view: "favourites" }
  | { view: "recents" }
  | { view: "browse" }
  | { view: "kind"; kind: SkyTargetKind };

export function SkySearch({
  extra = [],
  favourites,
  recentIds,
  onPick,
  onToggleFavourite,
  onClose,
}: {
  extra?: SkyTarget[];
  favourites: string[];
  recentIds: string[];
  onPick: (target: SkyTarget) => void;
  onToggleFavourite: (id: string) => void;
  onClose: () => void;
}) {
  const { lang } = useLocale();
  const pick = (ne: string, en: string) => bilingualText(lang, ne, en);
  const name = (t: SkyTarget) => pick(t.ne, t.en);
  const hint = (t: SkyTarget) =>
    t.hintNe || t.hintEn ? pick(t.hintNe ?? "", t.hintEn ?? "") : "";

  const [query, setQuery] = useState("");
  const [pane, setPane] = useState<Pane>({ view: "home" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Deliberately *not* focused on open. Opening the panel is how you browse
     what is up there — the कोटि rows, the favourites, the recents — and
     stealing focus put a keyboard over the top of exactly that, on a phone
     covering most of it. The field is focused when it is pressed, which is
     when someone has decided to type. */

  const byId = useMemo(() => {
    const map = new Map(SKY_BY_ID);
    for (const t of extra) map.set(t.id, t);
    return map;
  }, [extra]);

  const results = useMemo(() => searchSky(query, 40, extra), [query, extra]);
  const favourited = useMemo(() => new Set(favourites), [favourites]);

  const rowsFor = (): { rows: SkyTarget[]; empty: string } => {
    switch (pane.view) {
      case "favourites":
        return {
          rows: favourites.map((id) => byId.get(id)).filter((t): t is SkyTarget => !!t),
          empty: pick("अझै कुनै मनपर्ने छैन", "No favourites yet"),
        };
      case "recents":
        return {
          rows: recentIds.map((id) => byId.get(id)).filter((t): t is SkyTarget => !!t),
          empty: pick("अझै केही हेरिएको छैन", "Nothing looked at yet"),
        };
      case "kind":
        return { rows: skyTargetsOfKind(pane.kind, extra), empty: "" };
      default:
        return { rows: [], empty: "" };
    }
  };

  const shortcut = (
    key: string,
    icon: React.ReactNode,
    label: string,
    count: number | null,
    onPress: () => void,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-base font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      <span className="grid size-5 shrink-0 place-items-center text-white/60">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== null ? <span className="text-xs text-white/45">{count}</span> : null}
      <ChevronRight className="size-4 shrink-0 text-white/40" />
    </button>
  );

  const row = (t: SkyTarget) => (
    <div key={t.id} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPick(t)}
        className="flex min-w-0 flex-1 items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
      >
        <span className="truncate text-base font-semibold text-white/90">{name(t)}</span>
        {hint(t) ? <span className="shrink-0 text-xs text-white/45">{hint(t)}</span> : null}
      </button>
      <button
        type="button"
        aria-label={pick("पसन्दमा राख्नुहोस्", "Favourite")}
        onClick={() => onToggleFavourite(t.id)}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-white/35 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Star className={cn("size-3.5", favourited.has(t.id) && "fill-amber-300 text-amber-300")} />
      </button>
    </div>
  );

  const back = (label: string, to: Pane) => (
    <button
      type="button"
      onClick={() => setPane(to)}
      className="mb-1 flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45 transition-colors hover:text-white"
    >
      <ChevronLeft className="size-3.5" />
      {label}
    </button>
  );

  const { rows, empty } = rowsFor();
  const searching = query.trim().length > 0;

  return (
    <div
      data-sky-controls
      /* Wider and taller than it was (320/52vh). This panel is a list you read
         — कोटि rows, favourites, recents — and at the old width the longer
         नक्षत्र and नेब्युला names truncated on nearly every row. */
      className="flex w-[min(400px,calc(100vw-1.5rem))] flex-col gap-2 rounded-xl border border-white/15 bg-black/90 p-3 backdrop-blur"
    >
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5">
        <Search className="size-4 shrink-0 text-white/50" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pick("ग्रह, तारा, नक्षत्र…", "Planet, star, constellation…")}
          aria-label={pick("आकाशमा खोज्नुहोस्", "Search the sky")}
          /* text-base, not text-sm: iOS Safari auto-zooms the whole page —
             canvas included — into any input under 16px on focus, which is
             what read as "the 3D animation zooms in" the moment search
             opened on a phone. 16px is the floor that keeps it from firing. */
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/35"
        />
        {query ? (
          <button
            type="button"
            aria-label={pick("खाली गर्नुहोस्", "Clear")}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="grid size-5 shrink-0 place-items-center rounded text-white/45 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={pick("खोज बन्द गर्नुहोस्", "Close search")}
            onClick={onClose}
            className="grid size-5 shrink-0 place-items-center rounded text-white/45 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-[min(64vh,460px)] overflow-y-auto overscroll-contain">
        {searching ? (
          results.length ? (
            <div className="flex flex-col">{results.map(row)}</div>
          ) : (
            <p className="m-0 px-2.5 py-3 text-center text-xs text-white/45">
              {pick("केही भेटिएन", "Nothing found")}
            </p>
          )
        ) : pane.view === "home" ? (
          <div className="flex flex-col">
            {shortcut("favourites", <Star className="size-4" />, pick("मनपर्ने", "Favourites"), favourites.length, () =>
              setPane({ view: "favourites" }),
            )}
            {shortcut("recents", <Clock className="size-4" />, pick("हालैको", "Recents"), recentIds.length, () =>
              setPane({ view: "recents" }),
            )}
            {shortcut("browse", <List className="size-4" />, pick("सूची", "Browse"), null, () =>
              setPane({ view: "browse" }),
            )}
          </div>
        ) : pane.view === "browse" ? (
          <div className="flex flex-col">
            {back(pick("पछाडि", "Back"), { view: "home" })}
            {SKY_KINDS.map((k) =>
              shortcut(
                k.kind,
                <List className="size-4" />,
                pick(k.ne, k.en),
                skyTargetsOfKind(k.kind, extra).length,
                () => setPane({ view: "kind", kind: k.kind }),
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {back(
              pick("पछाडि", "Back"),
              pane.view === "kind" ? { view: "browse" } : { view: "home" },
            )}
            {rows.length ? (
              rows.map(row)
            ) : (
              <p className="m-0 px-2.5 py-3 text-center text-xs text-white/45">{empty}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
