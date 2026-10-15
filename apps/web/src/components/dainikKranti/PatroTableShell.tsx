import type { ReactNode } from "react";
import { usePatroTableShell } from "@vedic-patro/features/common";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  /** Copy keys; in Nepali the English title shows under the Nepali one. */
  titleKey: string;
  subtitleKey?: string;
  children: ReactNode;
  className?: string;
};

export function PatroTableShell({ titleKey, subtitleKey, children, className }: Props) {
  const shell = usePatroTableShell(titleKey, subtitleKey);
  return (
    <section className={cn(dainikKrantiClasses.shell, className)}>
      <header className={dainikKrantiClasses.shellHead}>
        <h3 className={dainikKrantiClasses.shellTitle}>{shell.title}</h3>
        {shell.titleEn ? <p className={dainikKrantiClasses.shellTitleEn}>{shell.titleEn}</p> : null}
        {shell.subtitle ? <p className={dainikKrantiClasses.shellSubtitle}>{shell.subtitle}</p> : null}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
