import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DataUnavailablePanel } from "@/components/common/DataUnavailablePanel";

type RoutePageStateProps<T> = {
  isLoading: boolean;
  data: T | undefined;
  children: (data: T) => ReactNode;
  loadingClassName?: string;
  errorMessageKey?: string;
  errorMessage?: string;
};

/**
 * Standard query UI: loading (no cached data) → success → error.
 */
export function RoutePageState<T>({
  isLoading,
  data,
  children,
  loadingClassName,
  errorMessageKey = "common.load_error",
  errorMessage,
}: RoutePageStateProps<T>) {
  const { t } = useTranslation();

  if (isLoading && !data) {
    return <p className={cn("text-sm", loadingClassName)}>{t("common.loading")}</p>;
  }
  if (data !== undefined && data !== null) {
    return <>{children(data)}</>;
  }
  return (
    <DataUnavailablePanel message={errorMessage ?? t(errorMessageKey)} />
  );
}
