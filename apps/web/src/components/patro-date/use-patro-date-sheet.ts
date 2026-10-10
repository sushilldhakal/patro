import { useState } from "react";

export type PatroSheetTab = "date" | "location";

/**
 * State for the phone date sheet, shared by every date nav so the three of them
 * (day+time, month+year, year) behave identically. Kept as a hook rather than
 * baked into one nav because the two things that open the sheet — the date chip
 * and the location chip — sit in different slots of each nav's layout.
 */
export function usePatroDateSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PatroSheetTab>("date");
  return {
    open,
    setOpen,
    tab,
    setTab,
    openDate: () => {
      setTab("date");
      setOpen(true);
    },
    openLocation: () => {
      setTab("location");
      setOpen(true);
    },
  };
}

export type PatroDateSheetState = ReturnType<typeof usePatroDateSheet>;
