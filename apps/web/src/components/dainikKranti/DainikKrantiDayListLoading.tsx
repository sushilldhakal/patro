import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import { cn } from "@vedic-patro/design-tokens/cn";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { TableCell, TableRow } from "@/components/ui/table";

export function DainikKrantiMobileLoading() {
  return (
    <div className={cn(dainikKrantiClasses.shell, "py-12")} aria-busy="true" aria-live="polite">
      <VedicPatroLoader size={88} />
    </div>
  );
}

export function DainikKrantiTableLoading({ colSpan }: { colSpan: number }) {
  return (
    <TableRow aria-busy="true">
      <TableCell colSpan={colSpan} className="py-12">
        <VedicPatroLoader size={88} />
      </TableCell>
    </TableRow>
  );
}
