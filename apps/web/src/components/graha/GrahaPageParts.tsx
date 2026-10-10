import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  GRAHA_PAGE_DESCRIPTIONS,
  type GrahaPageDescription,
} from "@/lib/graha-detail-descriptions";
import { elementDescriptionBlocks } from "@/lib/panchanga-i18n";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@/lib/utils";

export function GrahaBanner({
  icon,
  titleKey,
  blurbKey,
}: {
  icon: React.ReactNode;
  titleKey: string;
  blurbKey: string;
}) {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        patroCard,
        "rounded-2xl border border-border/80 bg-gradient-to-br from-secondary/10 via-card to-card px-5 py-5 dark:from-secondary/12",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary ring-1 ring-secondary/20 [&_svg]:size-6"
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {t(titleKey)}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(blurbKey)}</p>
        </div>
      </div>
    </header>
  );
}

/** "About" block — what it is · how it's calculated · what it means. */
export function GrahaDescription({ pageId }: { pageId: string }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const desc: GrahaPageDescription | undefined = GRAHA_PAGE_DESCRIPTIONS[pageId];
  if (!desc) return null;

  const blocks = [
    { section: "what" as const, body: desc.what },
    { section: "how" as const, body: desc.how },
    { section: "meaning" as const, body: desc.meaning },
  ];

  return (
    <section className={cn(patroCard, "mt-6 p-4")} aria-label={t("common.about")}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">
        {t("common.about")}
      </h2>
      <div className="flex flex-col gap-4">
        {blocks.map((b) => (
          <div key={b.section} className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-foreground">
              {t(`element_page.section_${b.section}`)}
            </h3>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              {bilingualText(lang, b.body.ne, b.body.en)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Element page "About" block — descriptions from i18n JSON. */
export function ElementDescription({ elementId }: { elementId: string }) {
  const { t, i18n } = useTranslation();
  const blocks = elementDescriptionBlocks(elementId, i18n.language);

  if (!blocks.some((b) => b.body)) return null;

  return (
    <section className={cn(patroCard, "mt-6 p-4")} aria-label={t("common.about")}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary">
        {t("common.about")}
      </h2>
      <div className="flex flex-col gap-4">
        {blocks.map((b) => (
          <div key={b.section} className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-foreground">
              {t(`element_page.section_${b.section}`)}
            </h3>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
