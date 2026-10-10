import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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
    <section className={cn("rounded-xl border border-border", className)}>
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{bilingualText(lang, titleNe, titleEn ?? titleNe)}</h3>
        {titleEn && lang === "ne" ? (
          <p className="mt-0.5 text-sm">{titleEn}</p>
        ) : null}
        {subtitle ? (
          <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, subtitle, subtitleEn ?? subtitle)}</p>
        ) : null}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
