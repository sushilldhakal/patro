/**
 * Date converter page logic, shared by the website (`apps/web/src/pages/Converter.tsx`)
 * and the app (`apps/mobile/app/(tabs)/converter.tsx`).
 *
 * The app passes its own conversion functions (they answer from the bundled
 * calendar table when offline); the website uses the API directly.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convertorKeys, fetchAdToBs, fetchBsToAd, type ConvertAdToBs, type ConvertBsToAd } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { resultCards, todayInputs, type ConvertCard, type ConvertMode } from "./model";

export * from "./model";

export type ConverterPage = {
  copy: { title: string; subtitle: string; convert: string; error: string; inputLabel: string; placeholder: string };
  modes: { id: ConvertMode; from: "AD" | "BS"; to: "AD" | "BS"; active: boolean }[];
  mode: ConvertMode;
  setMode: (mode: ConvertMode) => void;
  /** The text field for the current direction. */
  input: string;
  setInput: (value: string) => void;
  submit: () => void;
  status: "idle" | "loading" | "error" | "ready";
  /** `from → to` line and the cards, once a conversion has come back. */
  result?: { from: string; to: string; cards: (ConvertCard & { label: string })[] };
};

export function useConverterPage(options: {
  adToBs?: (date: string) => Promise<ConvertAdToBs>;
  bsToAd?: (date: string) => Promise<ConvertBsToAd>;
} = {}): ConverterPage {
  const { t, lang } = useLocale();
  const adToBs = options.adToBs ?? fetchAdToBs;
  const bsToAd = options.bsToAd ?? fetchBsToAd;
  const [today] = useState(todayInputs);
  const [mode, setMode] = useState<ConvertMode>("ad-to-bs");
  const [adInput, setAdInput] = useState(today.ad);
  const [bsInput, setBsInput] = useState(today.bs);
  const [adDate, setAdDate] = useState(today.ad);
  const [bsDate, setBsDate] = useState(today.bs);

  const adToBsQ = useQuery({
    queryKey: convertorKeys.adToBs(adDate),
    queryFn: () => adToBs(adDate),
    enabled: mode === "ad-to-bs" && !!adDate,
    staleTime: Infinity,
  });
  const bsToAdQ = useQuery({
    queryKey: convertorKeys.bsToAd(bsDate),
    queryFn: () => bsToAd(bsDate),
    enabled: mode === "bs-to-ad" && !!bsDate,
    staleTime: Infinity,
  });

  const active = mode === "ad-to-bs" ? adToBsQ : bsToAdQ;
  const data = active.data;
  const adToBsMode = mode === "ad-to-bs";

  return {
    copy: {
      title: t("converter.title"),
      subtitle: t("converter.subtitle"),
      convert: t("converter.convert"),
      error: t("converter.error"),
      inputLabel: t(adToBsMode ? "converter.ad_date" : "converter.bs_date"),
      placeholder: adToBsMode ? today.ad : "2083-02-24",
    },
    modes: [
      { id: "ad-to-bs", from: "AD", to: "BS", active: adToBsMode },
      { id: "bs-to-ad", from: "BS", to: "AD", active: !adToBsMode },
    ],
    mode,
    setMode,
    input: adToBsMode ? adInput : bsInput,
    setInput: adToBsMode ? setAdInput : setBsInput,
    submit: () => (adToBsMode ? setAdDate(adInput.trim()) : setBsDate(bsInput.trim())),
    status: active.isError ? "error" : active.isLoading ? "loading" : data ? "ready" : "idle",
    result: data
      ? {
          from: adToBsMode ? data.ad_date : data.bs_date,
          to: adToBsMode ? data.bs_date : data.ad_date,
          cards: resultCards(mode, data, lang).map((c) => ({ ...c, label: t(c.labelKey) })),
        }
      : undefined,
  };
}
