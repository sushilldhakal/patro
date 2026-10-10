import { findNakshatraIcon } from "@/lib/nakshatra-icons";
import { nakshatraIcon } from "@/lib/learn-classes";
import { cn } from "@/lib/utils";

interface Props {
  name?: string | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}

/** Traditional nakshatra symbol (not the star constellation diagram). */
export function NakshatraIcon({
  name,
  size = 28,
  strokeWidth = 2,
  className,
  title,
}: Props) {
  const data = findNakshatraIcon(name);
  if (!data) return null;

  const label = title ?? `${data.ne} · ${data.sym_ne}`;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(nakshatraIcon, className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <g dangerouslySetInnerHTML={{ __html: data.svg }} />
    </svg>
  );
}
