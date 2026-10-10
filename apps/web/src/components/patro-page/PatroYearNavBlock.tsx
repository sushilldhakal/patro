import { PatroYearNav, type PatroYearNavProps } from "@/components/patro-date";

type PatroYearNavBlockProps = PatroYearNavProps & {
  /** Wrapper around {@link PatroYearNav}; default adds vertical spacing for graha year pages. */
  className?: string;
};

export function PatroYearNavBlock({
  className = "space-y-3",
  ...navProps
}: PatroYearNavBlockProps) {
  return (
    <div className={className}>
      <PatroYearNav {...navProps} />
    </div>
  );
}
