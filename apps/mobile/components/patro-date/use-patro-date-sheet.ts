import { useCallback, useState } from "react";

export type PatroSheetTab = "date" | "location";

export function usePatroDateSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PatroSheetTab>("date");

  const openDate = useCallback(() => {
    setTab("date");
    setOpen(true);
  }, []);

  const openLocation = useCallback(() => {
    setTab("location");
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, tab, setTab, openDate, openLocation, close };
}

export type PatroDateSheetController = ReturnType<typeof usePatroDateSheet>;
