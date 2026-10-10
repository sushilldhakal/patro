import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BsNativeSelectOption } from "@/components/BsNativeSelect";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import type { Era, Language } from "@/lib/era";
import { cn } from "@/lib/utils";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import { lazyBrowseYearListItems } from "@/lib/patro-browse-year-items";
import { formatBrowsePatroYearPicker, isValidBrowseYear } from "@/lib/patro-year-axis";
import { parsePatroYearSearchQuery } from "@/lib/patro-year-search-query";
import { PatroYearEraToggle } from "./PatroYearEraToggle";

export type PatroYearComboboxProps = {
  era: Era;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
  comfortable?: boolean;
  displayLanguage?: Language;
  /** Sorted ascending browse years — labels built lazily for the open list window. */
  yearRange?: readonly number[];
  /** @deprecated Prefer `yearRange`; small pre-labeled lists only. */
  options?: BsNativeSelectOption[];
  /** BS↔BBS / AD↔BC — shown at the top of the dropdown (not beside the trigger). */
  onEraChange?: (era: Era) => void;
};

type YearItem = BsNativeSelectOption;

function freeformYearItems(
  era: Era,
  value: number,
  query: string,
  digits: (n: number | string) => string,
): YearItem[] {
  const q = query.trim();
  const { n } = parsePatroYearSearchQuery(q, era);
  if (n != null) {
    if (!isValidBrowseYear(era, n)) return [];
    return [{ value: n, label: formatBrowsePatroYearPicker(n, digits) }];
  }
  if (q) return [];

  const items: YearItem[] = [];
  for (let offset = -12; offset <= 12; offset++) {
    const y = value + offset;
    if (y >= 1) {
      items.push({ value: y, label: formatBrowsePatroYearPicker(y, digits) });
    }
  }
  return items;
}

export function PatroYearCombobox(props: PatroYearComboboxProps) {
  const { t } = useTranslation();
  const { digits } = usePatroDisplayLocale(props.displayLanguage);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const useYearRange = props.yearRange != null && props.yearRange.length > 0;

  const selected = useMemo(() => {
    const label = formatBrowsePatroYearPicker(props.value, digits);
    return { value: props.value, label };
  }, [props.value, digits]);

  const listItems = useMemo(() => {
    if (useYearRange && props.yearRange) {
      return lazyBrowseYearListItems(
        props.yearRange,
        query,
        props.value,
        props.era,
        digits,
      );
    }
    return freeformYearItems(props.era, props.value, query, digits);
  }, [useYearRange, props.yearRange, props.era, props.value, query, digits]);

  const triggerLabel = selected.label;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPortalContainer(
        triggerRef.current?.closest<HTMLElement>(
          "[data-slot=drawer-content], [data-slot=sheet-content]",
        ) ?? null,
      );
    } else {
      setPortalContainer(null);
    }
    setOpen(next);
    if (!next) setQuery("");
  };

  const commitTypedYear = () => {
    const { n } = parsePatroYearSearchQuery(query, props.era);
    if (n != null && n >= 1 && isValidBrowseYear(props.era, n)) {
      props.onChange(n);
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Combobox
      open={open}
      onOpenChange={handleOpenChange}
      items={listItems}
      filter={null}
      modal={false}
      value={selected}
      onValueChange={(item) => {
        if (item && isValidBrowseYear(props.era, item.value)) {
          props.onChange(item.value);
          setOpen(false);
          setQuery("");
        }
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringValue={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxTrigger
        ref={triggerRef}
        type="button"
        aria-label={props.ariaLabel}
        className={cn(
          "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-between gap-0.5 rounded-md border border-border bg-card font-num text-foreground",
          props.comfortable
            ? "h-9 gap-1 px-2 text-sm"
            : "h-6 gap-0.5 px-1 text-sm sm:h-7 sm:gap-1 sm:px-1.5 sm:text-xs",
          props.className,
        )}
      >
        <span className="truncate">{triggerLabel}</span>
      </ComboboxTrigger>
      <ComboboxContent
        container={portalContainer}
        align="start"
        side="bottom"
        sideOffset={4}
        className="z-[100] min-w-[10rem] w-[min(calc(100vw-2rem),14rem)]"
      >
        {props.onEraChange ? (
          <PatroYearEraToggle
            era={props.era}
            onEraChange={props.onEraChange}
            variant="dropdown"
          />
        ) : null}
        <ComboboxInput
          showTrigger={false}
          placeholder={t("patro_date.year_search_placeholder")}
          className="w-full font-num"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTypedYear();
            }
          }}
        />
        <ComboboxEmpty className="py-2 text-xs">
          {t("patro_date.year_search_empty")}
        </ComboboxEmpty>
        <ComboboxList className="max-h-60 font-num">
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
