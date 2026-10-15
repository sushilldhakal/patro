import { PatroDateNav } from "./PatroDateNav";
import type { PatroDateNavProps } from "./types";

type MonthYearNavProps = Omit<Extract<PatroDateNavProps, { mode: "year-month" }>, "mode">;

/** Month + year navigation — home calendar, dainik kranti, month-browse pages (web `PatroMonthYearNav`). */
export function PatroMonthYearNav(props: MonthYearNavProps) {
  return <PatroDateNav mode="year-month" {...props} />;
}
