import type { ReactNode } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale, bilingualText } from "@/i18n/locale";

type Props = {
  titleNe: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  children: ReactNode;
  className?: string;
};

export function PatroTableShell({ titleNe, titleEn, subtitle, subtitleEn, children, className }: Props) {
  const { lang } = useLocale();
  return (
    <section className={cn(dainikKrantiClasses.shell, className)}>
      <header className={dainikKrantiClasses.shellHead}>
        <h3 className={dainikKrantiClasses.shellTitle}>{bilingualText(lang, titleNe, titleEn ?? titleNe)}</h3>
        {titleEn && lang === "ne" ? (
          <p className={dainikKrantiClasses.shellTitleEn}>{titleEn}</p>
        ) : null}
        {subtitle ? (
          <p className={dainikKrantiClasses.shellSubtitle}>{bilingualText(lang, subtitle, subtitleEn ?? subtitle)}</p>
        ) : null}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
