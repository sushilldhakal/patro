import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import type { PatroBrowseEra } from "@/lib/patro-era";
import { PatroYearBrowseNav, type PatroYearBrowseNavProps } from "./PatroYearBrowseNav";

type Props = Omit<
  PatroYearBrowseNavProps,
  "era" | "onEraChange" | "year" | "onYearChange"
> & {
  era?: PatroBrowseEra;
  onEraChange?: (era: PatroBrowseEra) => void;
  year: number;
  onYearChange: (year: number) => void;
  className?: string;
};

/** Year-only browse bar — {@link PatroYearBrowseNav} with optional internal era state. */
export function PatroYearDateNav({
  era: eraProp,
  onEraChange: onEraChangeProp,
  year,
  onYearChange,
  className,
  ...rest
}: Props) {
  const browse = usePatroYearBrowse(year);
  const era = eraProp ?? browse.era;
  const setEra = onEraChangeProp ?? browse.setEra;

  return (
    <PatroYearBrowseNav
      className={className}
      era={era}
      onEraChange={setEra}
      year={year}
      onYearChange={onYearChange}
      {...rest}
    />
  );
}
