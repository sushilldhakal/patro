import type { ReactNode } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { tFor } from "@vedic-patro/i18n/runtime";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/i18n/locale";

type Props = {
  /** Copy keys; in Nepali the English title shows under the Nepali one. */
  titleKey: string;
  subtitleKey?: string;
  children: ReactNode;
  className?: string;
};

export function PatroTableShell({ titleKey, subtitleKey, children, className }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  return (
    <section className={cn(dainikKrantiClasses.shell, className)}>
      <header className={dainikKrantiClasses.shellHead}>
        <h3 className={dainikKrantiClasses.shellTitle}>{t(titleKey)}</h3>
        {lang === "ne" ? <p className={dainikKrantiClasses.shellTitleEn}>{tFor("en", titleKey)}</p> : null}
        {subtitleKey ? <p className={dainikKrantiClasses.shellSubtitle}>{t(subtitleKey)}</p> : null}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
